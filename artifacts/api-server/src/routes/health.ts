import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, userSettingsTable } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// ── Helpers ──────────────────────────────────────────────────────────
type ProbeResult = {
  ok: boolean;
  status: number;
  latencyMs: number | null;
  message: string;
};

async function probe(
  url: string,
  init?: RequestInit,
  timeoutMs = 5000,
): Promise<ProbeResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    const latencyMs = Date.now() - start;
    clearTimeout(t);
    let message = "";
    if (!r.ok) {
      message = (await r.text().catch(() => "")).slice(0, 160);
    }
    return { ok: r.ok, status: r.status, latencyMs, message };
  } catch (err) {
    clearTimeout(t);
    return {
      ok: false,
      status: 0,
      latencyMs: null,
      message: String(err).slice(0, 160),
    };
  }
}

function requireAuth(req: Request, res: Response): number | null {
  const userId = (req as unknown as { session: { userId?: number } }).session
    ?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado" });
    return null;
  }
  return userId;
}

// ── /diag (legacy lightweight) ───────────────────────────────────────
// Endpoint padrão hospedado (mantido em sincronia com geocoder.ts).
const DEFAULT_GEOCODEBR_URL = "https://viaxtrace-viaxgeocoder.hf.space";

function geocodebrAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const hf = (process.env.GEOCODEBR_HF_TOKEN ?? "").trim();
  const apiKey = (process.env.GEOCODEBR_API_KEY ?? "").trim();
  if (hf) headers["Authorization"] = `Bearer ${hf}`;
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

router.get("/diag", async (_req, res) => {
  const out: Record<string, unknown> = {
    status: "ok",
    time: new Date().toISOString(),
    geocodebr: { configured: false, reachable: false, status: 0, message: "" },
  };

  const url = (process.env.GEOCODEBR_URL ?? DEFAULT_GEOCODEBR_URL).trim();
  if (url) {
    (out.geocodebr as Record<string, unknown>).configured = true;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(`${url.replace(/\/$/, "")}/health`, {
        signal: ctrl.signal,
        headers: geocodebrAuthHeaders(),
      });
      clearTimeout(t);
      const body = await r.text().catch(() => "");
      (out.geocodebr as Record<string, unknown>).reachable = r.ok;
      (out.geocodebr as Record<string, unknown>).status = r.status;
      (out.geocodebr as Record<string, unknown>).message = body.slice(0, 200);
    } catch (err) {
      (out.geocodebr as Record<string, unknown>).message = String(err);
      logger.debug({ err: String(err) }, "geocodebr unreachable in /diag");
    }
  }

  res.json(out);
});

// ── /diag/maintenance ────────────────────────────────────────────────
// Public (no auth). Returns the operator-defined maintenance message, if any.
// To enable a banner across all clients, set MAINTENANCE_MESSAGE in the
// server environment. Optional MAINTENANCE_SEVERITY = info | warning |
// critical (defaults to "warning").
router.get("/diag/maintenance", (_req, res) => {
  const message = (process.env.MAINTENANCE_MESSAGE ?? "").trim();
  const severityRaw = (process.env.MAINTENANCE_SEVERITY ?? "warning")
    .trim()
    .toLowerCase();
  const severity = ["info", "warning", "critical"].includes(severityRaw)
    ? severityRaw
    : "warning";
  res.json({
    active: message.length > 0,
    message: message.length > 0 ? message : null,
    severity,
    serverTime: new Date().toISOString(),
  });
});

// ── /diag/providers ──────────────────────────────────────────────────
// Authenticated. Probes each upstream provider in parallel and returns its
// reachability + latency. Used by the mobile/web UI to show live status
// badges in Settings → Instâncias and the "Status do servidor" screen.
router.get("/diag/providers", async (req, res) => {
  const userId = requireAuth(req, res);
  if (userId == null) return;

  const settings = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);
  const s = settings[0];
  // Endpoint hospedado é a fonte da verdade. A coluna `geocodebrUrl`
  // per-user permanece no DB por back-compat (registros antigos), mas
  // não é mais consultada — a UI manual foi removida e o Space privado
  // do ViaX:Trace é o único endpoint suportado. Operadores ainda podem
  // forçar uma URL global via env GEOCODEBR_URL para staging/dev.
  const geocodebrUrl = (
    process.env.GEOCODEBR_URL || DEFAULT_GEOCODEBR_URL
  ).trim();
  const hasGoogleKey = !!s?.googleMapsApiKey?.trim();

  const ua = "ViaX-Trace/1.0 (diagnostic probe)";
  const probes = await Promise.all([
    probe(
      "https://photon.komoot.io/api/?q=test&limit=1",
      { headers: { "User-Agent": ua } },
      6000,
    ),
    probe(
      "https://nominatim.openstreetmap.org/status.php?format=json",
      { headers: { "User-Agent": ua } },
      6000,
    ),
    probe(
      "https://brasilapi.com.br/api/cep/v1/01310100",
      { headers: { "User-Agent": ua } },
      6000,
    ),
    probe(
      "https://overpass-api.de/api/status",
      { headers: { "User-Agent": ua } },
      6000,
    ),
    geocodebrUrl
      ? probe(
          `${geocodebrUrl.replace(/\/$/, "")}/health`,
          { headers: { "User-Agent": ua, ...geocodebrAuthHeaders() } },
          5000,
        )
      : Promise.resolve(null),
    hasGoogleKey
      ? probe(
          `https://maps.googleapis.com/maps/api/geocode/json?address=Brasilia&key=${encodeURIComponent(s!.googleMapsApiKey!)}`,
          {},
          6000,
        )
      : Promise.resolve(null),
  ]);

  const [photon, nominatim, brasilApi, overpass, geocodebr, googlemaps] =
    probes;

  res.json({
    serverTime: new Date().toISOString(),
    providers: {
      photon: { name: "Photon (Komoot)", ...photon },
      nominatim: { name: "Nominatim (OSM)", ...nominatim },
      brasilApi: { name: "BrasilAPI", ...brasilApi },
      overpass: { name: "Overpass API", ...overpass },
      geocodebr: geocodebr
        ? { name: "GeocodeR BR (hospedado)", configured: true, ...geocodebr }
        : { name: "GeocodeR BR (hospedado)", configured: false },
      googlemaps: googlemaps
        ? { name: "Google Maps", configured: true, ...googlemaps }
        : { name: "Google Maps", configured: false },
    },
  });
});

// ── /diag/ai-key ─────────────────────────────────────────────────────
// Authenticated. Validates an AI provider API key by hitting the provider's
// model-list endpoint. Body: { provider: 'openai'|'anthropic'|'google',
// apiKey: '...' }. Returns { ok, status, message }.
router.post("/diag/ai-key", async (req, res) => {
  const userId = requireAuth(req, res);
  if (userId == null) return;

  const body = req.body as { provider?: string; apiKey?: string } | undefined;
  const provider = (body?.provider ?? "").trim().toLowerCase();
  const apiKey = (body?.apiKey ?? "").trim();

  if (!provider || !apiKey) {
    res.status(400).json({
      ok: false,
      status: 400,
      message: "Provedor e chave são obrigatórios.",
    });
    return;
  }

  let url: string;
  let headers: Record<string, string>;
  switch (provider) {
    case "openai":
      url = "https://api.openai.com/v1/models";
      headers = { Authorization: `Bearer ${apiKey}` };
      break;
    case "anthropic":
      url = "https://api.anthropic.com/v1/models";
      headers = {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      break;
    case "google":
      url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      headers = {};
      break;
    default:
      res.status(400).json({
        ok: false,
        status: 400,
        message: `Provedor desconhecido: ${provider}`,
      });
      return;
  }

  const result = await probe(url, { headers }, 8000);
  let message = "";
  if (result.ok) {
    message = "Chave válida.";
  } else if (result.status === 401 || result.status === 403) {
    message = "Chave inválida ou sem permissão.";
  } else if (result.status === 429) {
    message = "Quota esgotada (mas a chave é válida).";
  } else if (result.status === 0) {
    message = "Sem conexão com o provedor.";
  } else {
    message = `Erro ${result.status}.`;
  }
  res.json({
    ok: result.ok || result.status === 429,
    status: result.status,
    latencyMs: result.latencyMs,
    message,
  });
});

export default router;
