import { Router, type IRouter } from "express";
import multer from "multer";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { eq } from "drizzle-orm";
import { db, userSettingsTable, analysesTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import {
  parsearEndereco,
  processarEndereco,
  type AddressRow,
  type ResultRow,
} from "../lib/geocoder.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const MAX_ENDERECOS = 500;

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  return userId;
}

function sendSSE(res: any, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (res.flush) res.flush();
}

function lerXLSX(buffer: Buffer): AddressRow[] {
  const wb = xlsxRead(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: "" });
  if (rows.length < 2) return [];

  const header = rows[0].map((c: any) => String(c).trim());
  const normalized = header.map(normalizarCabecalho);
  const colEnd = encontrarColuna(normalized, ["destination address", "endereco destino", "endereço destino", "endereco", "endereço", "address"]);
  const colLat = encontrarColuna(normalized, ["latitude", "lat"]);
  const colLon = encontrarColuna(normalized, ["longitude", "lon", "lng"]);
  const colCidade = encontrarColuna(normalized, ["city", "cidade", "municipio", "município"]);
  const colBairro = encontrarColuna(normalized, ["neighborhood", "bairro"]);
  const colCep = encontrarColuna(normalized, ["zipcodepostal code", "zipcode postal code", "zip", "zipcode", "postal code", "cep"]);

  if (colEnd === -1) throw new Error('Coluna "Destination Address" não encontrada.');

  const enderecos: AddressRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const endereco = String(row[colEnd] ?? "").trim();
    if (!endereco) continue;
    enderecos.push({
      linha: i + 1,
      endereco,
      lat: colLat !== -1 && row[colLat] !== "" ? Number(row[colLat]) : null,
      lon: colLon !== -1 && row[colLon] !== "" ? Number(row[colLon]) : null,
      cidade: colCidade !== -1 ? String(row[colCidade] ?? "").trim() : "",
      bairro: colBairro !== -1 ? String(row[colBairro] ?? "").trim() : "",
      cep: colCep !== -1 ? String(row[colCep] ?? "").trim() : "",
    });
  }
  return enderecos;
}

function lerCSV(buffer: Buffer): AddressRow[] {
  return lerXLSX(buffer);
}

function normalizarCabecalho(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function encontrarColuna(header: string[], aliases: string[]): number {
  for (const alias of aliases.map(normalizarCabecalho)) {
    const idx = header.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

router.post("/process/upload", upload.single("arquivo"), async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const tInicio = Date.now();

  try {
    if (!req.file) {
      sendSSE(res, "error", { error: "Nenhum arquivo recebido." });
      res.end();
      return;
    }

    const ext = req.file.originalname.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext ?? "")) {
      sendSSE(res, "error", { error: "Formato inválido. Use .xlsx ou .csv" });
      res.end();
      return;
    }

    let settings = (await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1))[0];
    if (!settings) {
      [settings] = await db.insert(userSettingsTable).values({
        userId,
        parserMode: "builtin",
        toleranceMeters: 300,
        instanceMode: "builtin",
      }).returning();
    }

    const instanceMode = (settings as any).instanceMode ?? "builtin";
    const googleMapsApiKey = (settings as any).googleMapsApiKey ?? null;
    // A coluna `geocodebrUrl` per-user permanece no DB por back-compat,
    // mas não é mais consultada — o endpoint hospedado (DEFAULT_GEOCODEBR_URL
    // em geocoder.ts, sobrescrito apenas via env GEOCODEBR_URL) é a fonte
    // da verdade desde a migração para o Space privado do HF.
    const geocodebrUrl: string | null = null;
    const toleranceMeters = (settings as any).toleranceMeters ?? 300;
    const parserMode = (settings as any).parserMode ?? "builtin";
    const aiProvider = (settings as any).aiProvider ?? null;
    const aiApiKey = (settings as any).aiApiKey ?? null;

    logger.info({
      userId, fileName: req.file.originalname, instanceMode, parserMode, toleranceMeters,
    }, "Início processamento de rota");

    sendSSE(res, "step", { step: "Lendo arquivo..." });

    let enderecos: AddressRow[];
    try {
      enderecos = ext === "xlsx" ? lerXLSX(req.file.buffer) : lerCSV(req.file.buffer);
    } catch (e: any) {
      logger.error({ error: e?.message }, "Erro ao ler arquivo");
      sendSSE(res, "error", { error: e.message ?? "Erro ao ler arquivo." });
      res.end();
      return;
    }

    if (enderecos.length === 0) {
      sendSSE(res, "error", { error: 'Nenhum endereço encontrado (coluna "Destination Address").' });
      res.end();
      return;
    }

    const totalOriginal = enderecos.length;
    enderecos = enderecos.slice(0, MAX_ENDERECOS);
    if (totalOriginal > MAX_ENDERECOS) {
      sendSSE(res, "step", { step: `⚠️ Arquivo tem ${totalOriginal} endereços. Processando os primeiros ${MAX_ENDERECOS}.` });
    }

    const instanceLabel =
      instanceMode === "googlemaps"
        ? "Google Maps API"
        : instanceMode === "geocodebr"
        ? "GeocodeR BR (CNEFE/IBGE) → Photon → Nominatim"
        : "GeocodeR BR (CNEFE/IBGE) + Photon + BrasilAPI + Nominatim";
    const parserLabel = parserMode === "ai" && aiProvider ? `IA (${aiProvider})` : "Parser embutido";
    sendSSE(res, "step", { step: `${enderecos.length} endereço(s) · Instância: ${instanceLabel} · Parser: ${parserLabel} · Tolerância: ${toleranceMeters}m` });

    const detalhes: ResultRow[] = [];
    let totalNuances = 0;
    let geocodeSucesso = 0;
    let ultimaReq = 0;
    const geoCache = new Map<string, { data: any; ts: number }>();

    // ── M9 — pré-passagem: detectar paradas com coordenada GPS idêntica ──
    // Quando duas linhas vêm da mesma coordenada (ex.: roteirizador agrupou
    // múltiplas notas no mesmo ponto), reusar a decisão da primeira evita
    // chamadas redundantes ao geocoder e mantém o veredicto consistente.
    const dedupKeyDe = (lat: number | null, lon: number | null): string | null => {
      if (lat === null || lon === null) return null;
      return `${lat.toFixed(5)}:${lon.toFixed(5)}`;
    };
    const primeiroIndicePorCoord = new Map<string, number>();
    const fonteDuplicata = new Array<number | null>(enderecos.length).fill(null);
    for (let i = 0; i < enderecos.length; i++) {
      const k = dedupKeyDe(enderecos[i].lat, enderecos[i].lon);
      if (!k) continue;
      const prev = primeiroIndicePorCoord.get(k);
      if (prev === undefined) {
        primeiroIndicePorCoord.set(k, i);
      } else {
        fonteDuplicata[i] = prev;
      }
    }
    const duplicatasDetectadas = fonteDuplicata.filter((v) => v !== null).length;
    if (duplicatasDetectadas > 0) {
      sendSSE(res, "step", { step: `M9: ${duplicatasDetectadas} parada(s) com GPS idêntico detectada(s) — auditoria reaproveitada.` });
    }

    for (let i = 0; i < enderecos.length; i++) {
      const item = enderecos[i];
      const label = item.endereco.length > 45 ? item.endereco.substring(0, 45) + "..." : item.endereco;
      sendSSE(res, "step", { step: `[${i + 1}/${enderecos.length}] ${label}` });

      // M9 — duplicata de coordenada: clona o resultado da fonte sem geocodar
      const fonteIdx = fonteDuplicata[i];
      if (fonteIdx !== null) {
        const fonte = detalhes[fonteIdx];
        const motivoBase = fonte.motivo
          ? `${fonte.motivo} (mesmo GPS da linha ${fonte.linha})`
          : `Coordenada GPS idêntica à linha ${fonte.linha}: auditoria reaproveitada.`;
        const clone: ResultRow = {
          ...fonte,
          linha: item.linha,
          endereco_original: item.endereco,
          motivo: motivoBase,
          duplicata_de_linha: fonte.linha,
        };
        detalhes.push(clone);
        if (clone.is_nuance) totalNuances++;
        if (clone.nome_rua_oficial) geocodeSucesso++;
        continue;
      }

      const { resultado, ultimaReq: novaUltimaReq } = await processarEndereco(
        item,
        instanceMode,
        googleMapsApiKey,
        ultimaReq,
        geoCache,
        toleranceMeters,
        parserMode,
        aiProvider,
        aiApiKey,
        geocodebrUrl
      );
      ultimaReq = novaUltimaReq;

      detalhes.push(resultado);
      if (resultado.is_nuance) totalNuances++;
      if (resultado.nome_rua_oficial) geocodeSucesso++;
    }

    // ── M10 — pós-passagem: detectar homônimos intra-rota ──
    // Mesma rua extraída em linhas distintas com GPS distantes ≥ 800 m sugere
    // vias homônimas (ex.: 4 ocorrências de "Rua das Pacas" em loteamentos
    // vizinhos). Marcamos a flag e enriquecemos o motivo pra alertar a auditoria.
    const haversineMetrosLocal = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000;
      const toRad = (g: number) => (g * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };
    const normalizarChave = (s: string | null) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\b(rua|r|av|avenida|alameda|estrada|rodovia|travessa|tv|trav|viela|beco|largo|praca|passagem)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const grupos = new Map<string, number[]>();
    for (let i = 0; i < detalhes.length; i++) {
      const chave = normalizarChave(detalhes[i].nome_rua_extraido);
      if (chave.length < 3) continue;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(i);
    }
    let homonimosMarcados = 0;
    for (const [, indices] of grupos) {
      if (indices.length < 2) continue;
      let maxDist = 0;
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const ea = enderecos[indices[a]];
          const eb = enderecos[indices[b]];
          if (ea.lat === null || ea.lon === null || eb.lat === null || eb.lon === null) continue;
          const d = haversineMetrosLocal(ea.lat, ea.lon, eb.lat, eb.lon);
          if (d > maxDist) maxDist = d;
        }
      }
      if (maxDist >= 800) {
        for (const idx of indices) {
          detalhes[idx].is_homonimo_intra_rota = true;
          const aviso = `Homônimo intra-rota: "${detalhes[idx].nome_rua_extraido}" aparece em ${indices.length} parada(s) com GPS distantes até ${Math.round(maxDist)} m. Risco de roteirização cruzada.`;
          detalhes[idx].motivo = detalhes[idx].motivo ? `${detalhes[idx].motivo} | ${aviso}` : aviso;
          if (!detalhes[idx].is_nuance) {
            detalhes[idx].is_nuance = true;
            totalNuances++;
          }
          homonimosMarcados++;
        }
      }
    }
    if (homonimosMarcados > 0) {
      sendSSE(res, "step", { step: `M10: ${homonimosMarcados} parada(s) marcada(s) como homônimo intra-rota.` });
    }

    sendSSE(res, "step", { step: "✓ Geocodificação concluída. Gerando relatório..." });

    const total = detalhes.length;
    const tempoMs = Date.now() - tInicio;
    const similarityAvg = detalhes.reduce((s, d) => s + (d.similaridade ?? 0), 0) / Math.max(total, 1);

    const [inserted] = await db.insert(analysesTable).values({
      userId,
      fileName: req.file.originalname,
      totalAddresses: total,
      nuances: totalNuances,
      geocodeSuccess: geocodeSucesso,
      similarityAvg: Math.round(similarityAvg * 1000) / 1000,
      processingTimeMs: tempoMs,
      parserMode: instanceMode === "googlemaps" ? "googlemaps" : parserMode,
      status: "done",
      results: JSON.stringify(detalhes),
    }).returning({ id: analysesTable.id });
    const analysisId = inserted?.id ?? null;

    const percentualProblema = total > 0 ? Math.round((totalNuances / total) * 100 * 10) / 10 : 0;

    logger.info({
      userId, fileName: req.file.originalname, total, totalNuances, percentualProblema,
      geocodeSucesso, tempoMs, instanceMode, parserMode, toleranceMeters,
    }, "Processamento concluído");

    sendSSE(res, "result", {
      result: {
        success: true,
        analysis_id: analysisId,
        total_enderecos: total,
        total_nuances: totalNuances,
        percentual_problema: percentualProblema,
        detalhes,
        metricas_tecnicas: {
          tempo_processamento_ms: tempoMs,
          taxa_geocode_sucesso: total > 0 ? Math.round((geocodeSucesso / total) * 100 * 10) / 10 : 0,
          instancia: instanceLabel,
          parser: parserLabel,
          tolerancia_metros: toleranceMeters,
        },
      },
    });
  } catch (e: any) {
    logger.error({ error: e?.message, stack: e?.stack }, "Erro interno no processamento");
    sendSSE(res, "error", { error: "Erro interno: " + (e.message ?? String(e)) });
  } finally {
    res.end();
  }
});

router.get("/process/status/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "ID de análise inválido." });
    return;
  }

  const rows = await db
    .select({
      id: analysesTable.id,
      fileName: analysesTable.fileName,
      totalAddresses: analysesTable.totalAddresses,
      nuances: analysesTable.nuances,
      geocodeSuccess: analysesTable.geocodeSuccess,
      similarityAvg: analysesTable.similarityAvg,
      processingTimeMs: analysesTable.processingTimeMs,
      parserMode: analysesTable.parserMode,
      status: analysesTable.status,
      results: analysesTable.results,
      createdAt: analysesTable.createdAt,
      userId: analysesTable.userId,
    })
    .from(analysesTable)
    .where(eq(analysesTable.id, id))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Análise não encontrada." });
    return;
  }

  const row = rows[0];
  if (row.userId !== userId) {
    res.status(403).json({ error: "Acesso negado." });
    return;
  }

  const total = row.totalAddresses;
  const percentualProblema =
    total > 0 ? Math.round((row.nuances / total) * 100 * 10) / 10 : 0;

  let detalhes: unknown[] = [];
  try {
    if (row.results) detalhes = JSON.parse(row.results);
  } catch {
    detalhes = [];
  }

  res.json({
    id: row.id,
    status: row.status,
    file_name: row.fileName,
    created_at: row.createdAt,
    total_enderecos: total,
    total_nuances: row.nuances,
    percentual_problema: percentualProblema,
    geocode_success: row.geocodeSuccess,
    similarity_avg: row.similarityAvg,
    processing_time_ms: row.processingTimeMs,
    parser_mode: row.parserMode,
    detalhes,
  });
});

export default router;
