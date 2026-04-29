/**
 * Geocoder benchmark / gap-finder.
 *
 * Reads every .xlsx in attached_assets/, runs the address parser (fast,
 * offline) on every row, and optionally runs the full pipeline
 * (parser + Photon + Overpass + Nominatim + BrasilAPI) against a sample.
 *
 * Usage:
 *   pnpm tsx scripts/src/geocoder-bench.ts                   # parser-only sweep over all rows
 *   pnpm tsx scripts/src/geocoder-bench.ts --live --n=30     # full pipeline against random 30 rows
 *   pnpm tsx scripts/src/geocoder-bench.ts --live --all      # full pipeline against every row (slow)
 *   pnpm tsx scripts/src/geocoder-bench.ts --live --file=name.xlsx
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import {
  parsearEndereco,
  processarEndereco,
  type AddressRow,
} from "../../artifacts/api-server/src/lib/geocoder.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const ASSETS_DIR = join(ROOT, "attached_assets");
const OUT_DIR = join(ROOT, ".local", "geocoder-bench");
mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const ALL = args.includes("--all");
const FILE_FILTER = args.find((a) => a.startsWith("--file="))?.split("=")[1];
const N = Number(args.find((a) => a.startsWith("--n="))?.split("=")[1] ?? "30");

interface RowIn extends AddressRow {
  source: string;
}

function loadRows(): RowIn[] {
  const files = readdirSync(ASSETS_DIR).filter((f) =>
    f.endsWith(".xlsx") && (!FILE_FILTER || f.includes(FILE_FILTER))
  );
  const out: RowIn[] = [];
  for (const f of files) {
    const wb = XLSX.read(readFileSync(join(ASSETS_DIR, f)), { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const endereco = String(r["Destination Address"] ?? "").trim();
      if (!endereco) continue;
      out.push({
        source: f,
        linha: i + 2,
        endereco,
        lat: r["Latitude"] ? Number(r["Latitude"]) : null,
        lon: r["Longitude"] ? Number(r["Longitude"]) : null,
        cidade: String(r["City"] ?? "").trim(),
        bairro: String(r["Bairro"] ?? "").trim(),
        cep: String(r["Zipcode/Postal code"] ?? "").trim(),
      });
    }
  }
  return out;
}

function dedupeByAddress(rows: RowIn[]): RowIn[] {
  const seen = new Set<string>();
  const out: RowIn[] = [];
  for (const r of rows) {
    const k = `${r.endereco}|${r.lat}|${r.lon}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function pickSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  // deterministic pick: every floor(arr.length/n)
  const step = Math.floor(arr.length / n);
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[i * step]);
  return out;
}

function runParserSweep(rows: RowIn[]) {
  const counts = {
    total: rows.length,
    semRua: 0,
    comViaSecundaria: 0,
    comPOI: 0,
    comercio: 0,
    avenidaExtensa: 0,
    rodovia: 0,
    semCEP: 0,
    semGPS: 0,
  };
  const parserOut: any[] = [];
  for (const r of rows) {
    const p = parsearEndereco(r.endereco, r.cidade, r.bairro, r.cep ?? "");
    if (!p.rua_principal) counts.semRua++;
    if (p.via_secundaria) counts.comViaSecundaria++;
    if (p.poi) counts.comPOI++;
    if (p.is_comercio) counts.comercio++;
    if (p.is_avenida_extensa) counts.avenidaExtensa++;
    if (p.is_rodovia) counts.rodovia++;
    if (!p.cep) counts.semCEP++;
    if (r.lat === null || r.lon === null) counts.semGPS++;
    parserOut.push({
      source: r.source,
      linha: r.linha,
      endereco: r.endereco,
      bairro: r.bairro,
      cidade: r.cidade,
      cep: r.cep,
      lat: r.lat,
      lon: r.lon,
      parsed: p,
    });
  }
  console.log("\n=== PARSER SWEEP ===");
  console.log(JSON.stringify(counts, null, 2));

  const file = join(OUT_DIR, "parser-sweep.json");
  writeFileSync(file, JSON.stringify(parserOut, null, 2));
  console.log("→", file);

  // surface the failures
  console.log("\n--- Parser FAILURES (no rua_principal) ---");
  const fails = parserOut.filter((x) => !x.parsed.rua_principal);
  for (const f of fails.slice(0, 25)) {
    console.log(`[${f.source} L${f.linha}] "${f.endereco}"`);
  }
  if (fails.length > 25) console.log(`... and ${fails.length - 25} more`);

  console.log("\n--- Suspicious parses (rua_principal too short / odd) ---");
  const suspicious = parserOut.filter(
    (x) => x.parsed.rua_principal && x.parsed.rua_principal.length < 8,
  );
  for (const s of suspicious.slice(0, 25)) {
    console.log(`[${s.source} L${s.linha}] rua="${s.parsed.rua_principal}" | "${s.endereco}"`);
  }
}

async function runLivePipeline(rows: RowIn[]) {
  console.log(`\n=== LIVE PIPELINE on ${rows.length} addresses ===`);
  const cache = new Map<string, { data: any; ts: number }>();
  let ultimaReq = 0;
  const out: any[] = [];
  let nuances = 0;
  let semOficial = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const start = Date.now();
    try {
      const { resultado, ultimaReq: nq } = await processarEndereco(
        r,
        "builtin",
        null,
        ultimaReq,
        cache,
        300, // toleranceMeters
        "builtin",
        null,
        null,
        null,
      );
      ultimaReq = nq;
      const ms = Date.now() - start;
      if (resultado.is_nuance) nuances++;
      if (!resultado.nome_rua_oficial) semOficial++;
      const status = resultado.is_nuance ? "✗" : "✓";
      console.log(
        `[${i + 1}/${rows.length}] ${status} (${ms}ms) ` +
        `extr="${resultado.nome_rua_extraido ?? ""}" ofic="${resultado.nome_rua_oficial ?? "-"}" ` +
        `sim=${resultado.similaridade ?? "-"} dist=${resultado.distancia_metros ?? "-"}m ` +
        `motivo="${resultado.motivo}"`,
      );
      out.push({
        source: r.source,
        endereco: r.endereco,
        lat: r.lat,
        lon: r.lon,
        cep: r.cep,
        cidade: r.cidade,
        bairro: r.bairro,
        ms,
        ...resultado,
      });
    } catch (err: any) {
      console.log(`[${i + 1}/${rows.length}] ERROR: ${err?.message}`);
      out.push({ source: r.source, linha: r.linha, endereco: r.endereco, error: err?.message });
    }
  }

  const file = join(OUT_DIR, "live-pipeline.json");
  writeFileSync(file, JSON.stringify(out, null, 2));
  const summary = {
    total: rows.length,
    nuances,
    nuance_rate: rows.length ? Math.round((nuances / rows.length) * 1000) / 10 : 0,
    sem_oficial: semOficial,
    cobertura_geocode: rows.length ? Math.round(((rows.length - semOficial) / rows.length) * 1000) / 10 : 0,
  };
  console.log("\n=== LIVE SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("→", file);
}

(async () => {
  const all = loadRows();
  const dedup = dedupeByAddress(all);
  console.log(`Loaded ${all.length} rows from xlsx; ${dedup.length} unique by (endereco,lat,lon).`);

  runParserSweep(dedup);

  if (LIVE) {
    const sample = ALL ? dedup : pickSample(dedup, N);
    await runLivePipeline(sample);
  } else {
    console.log("\n(skipping live pipeline; pass --live to enable)");
  }
})();
