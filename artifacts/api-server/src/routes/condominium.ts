import { Router, type IRouter } from "express";
import multer from "multer";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { logger } from "../lib/logger.js";
import { listCondos, getCondo, buildRoute } from "../lib/condo-maps/index.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const MAX_LINHAS = 500;

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Não autenticado." }); return null; }
  return userId;
}

function sendSSE(res: any, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (res.flush) res.flush();
}

function normalizarCabecalho(valor: string): string {
  return valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function lerArquivo(buffer: Buffer): { linha: number; endereco: string }[] {
  const wb = xlsxRead(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = xlsxUtils.sheet_to_json(ws, { header: 1, defval: "" });
  if (rows.length < 2) return [];
  const header = rows[0].map((c: any) => normalizarCabecalho(String(c)));
  const aliases = ["destination address", "endereco destino", "endereço destino", "endereco", "endereço", "address"];
  let colEnd = -1;
  for (const a of aliases.map(normalizarCabecalho)) {
    const idx = header.indexOf(a);
    if (idx !== -1) { colEnd = idx; break; }
  }
  if (colEnd === -1) throw new Error('Coluna "Destination Address" não encontrada.');

  const out: { linha: number; endereco: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const e = String(rows[i][colEnd] ?? "").trim();
    if (!e) continue;
    out.push({ linha: i + 1, endereco: e });
  }
  return out;
}

router.get("/condominium/list", (_req, res) => {
  res.json({ condominios: listCondos() });
});

router.post("/condominium/process", upload.single("arquivo"), async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const condoId = String(req.body?.condominioId ?? "");
    const condo = getCondo(condoId);
    if (!condo) { sendSSE(res, "error", { error: "Condomínio inválido." }); res.end(); return; }
    if (condo.status !== "ativo") {
      sendSSE(res, "error", { error: `O condomínio "${condo.nome}" ainda está em desenvolvimento.` });
      res.end(); return;
    }
    if (!req.file) { sendSSE(res, "error", { error: "Nenhum arquivo recebido." }); res.end(); return; }

    const ext = req.file.originalname.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv"].includes(ext ?? "")) {
      sendSSE(res, "error", { error: "Formato inválido. Use .xlsx ou .csv" }); res.end(); return;
    }

    sendSSE(res, "step", { step: `Lendo planilha (${condo.nome})...` });

    let linhas: { linha: number; endereco: string }[];
    try {
      linhas = lerArquivo(req.file.buffer);
    } catch (e: any) {
      sendSSE(res, "error", { error: e.message ?? "Erro ao ler arquivo." }); res.end(); return;
    }
    if (!linhas.length) {
      sendSSE(res, "error", { error: "Nenhum endereço encontrado na planilha." }); res.end(); return;
    }
    if (linhas.length > MAX_LINHAS) {
      sendSSE(res, "step", { step: `⚠️ ${linhas.length} linhas; processando primeiras ${MAX_LINHAS}.` });
      linhas = linhas.slice(0, MAX_LINHAS);
    }

    sendSSE(res, "step", { step: `${linhas.length} endereço(s) detectado(s).` });
    sendSSE(res, "step", { step: "Identificando quadras e lotes..." });

    const result = buildRoute(linhas, condo);

    sendSSE(res, "step", { step: `${result.totalOrdenadas} ordenado(s) · ${result.totalSemCondominio} sem condomínio · ${result.totalNuances} nuance(s).` });
    sendSSE(res, "step", { step: "Gerando sequência logística com instruções..." });

    logger.info({ userId, condoId, total: linhas.length, ...result }, "Rota interna processada");
    sendSSE(res, "result", { result });
  } catch (e: any) {
    logger.error({ error: e?.message }, "Erro ferramenta condomínio");
    sendSSE(res, "error", { error: "Erro interno: " + (e.message ?? String(e)) });
  } finally {
    res.end();
  }
});

export default router;
