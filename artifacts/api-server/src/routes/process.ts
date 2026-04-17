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

    const instanceLabel = instanceMode === "googlemaps" ? "Google Maps API" : "Nominatim/OSM + BrasilAPI";
    const parserLabel = parserMode === "ai" && aiProvider ? `IA (${aiProvider})` : "Parser embutido";
    sendSSE(res, "step", { step: `${enderecos.length} endereço(s) · Instância: ${instanceLabel} · Parser: ${parserLabel} · Tolerância: ${toleranceMeters}m` });

    const detalhes: ResultRow[] = [];
    let totalNuances = 0;
    let geocodeSucesso = 0;
    let ultimaReq = 0;
    const geoCache = new Map<string, { data: any; ts: number }>();

    for (let i = 0; i < enderecos.length; i++) {
      const item = enderecos[i];
      const label = item.endereco.length > 45 ? item.endereco.substring(0, 45) + "..." : item.endereco;
      sendSSE(res, "step", { step: `[${i + 1}/${enderecos.length}] ${label}` });

      const { resultado, ultimaReq: novaUltimaReq } = await processarEndereco(
        item,
        instanceMode,
        googleMapsApiKey,
        ultimaReq,
        geoCache,
        toleranceMeters,
        parserMode,
        aiProvider,
        aiApiKey
      );
      ultimaReq = novaUltimaReq;

      detalhes.push(resultado);
      if (resultado.is_nuance) totalNuances++;
      if (resultado.nome_rua_oficial) geocodeSucesso++;
    }

    sendSSE(res, "step", { step: "✓ Geocodificação concluída. Gerando relatório..." });

    const total = detalhes.length;
    const tempoMs = Date.now() - tInicio;
    const similarityAvg = detalhes.reduce((s, d) => s + (d.similaridade ?? 0), 0) / Math.max(total, 1);

    await db.insert(analysesTable).values({
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
    });

    const percentualProblema = total > 0 ? Math.round((totalNuances / total) * 100 * 10) / 10 : 0;

    logger.info({
      userId, fileName: req.file.originalname, total, totalNuances, percentualProblema,
      geocodeSucesso, tempoMs, instanceMode, parserMode, toleranceMeters,
    }, "Processamento concluído");

    sendSSE(res, "result", {
      result: {
        success: true,
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

export default router;
