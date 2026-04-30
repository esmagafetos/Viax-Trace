import { logger } from "./logger.js";

const DEFAULT_GEOCODEBR_URL = "https://viaxtrace-viaxgeocoder.hf.space";

// Intervalo de ping: 4 min — HF free-tier hiberna após 5 min sem tráfego.
// Manter em 4 min garante que o cold-start (11-16s observado) nunca aconteça
// durante uma análise real, sem sobrecarregar o Space com pings desnecessários.
const PING_INTERVAL_MS = 4 * 60 * 1000;

// Timeout generoso no warm-up: Space pode estar acordando de um cold-start
// anterior (ex.: reinício do servidor após deploy).
const WARMUP_TIMEOUT_MS = 30_000;
const KEEPALIVE_TIMEOUT_MS = 8_000;

function geocodebrUrl(): string {
  return (process.env.GEOCODEBR_URL ?? DEFAULT_GEOCODEBR_URL)
    .trim()
    .replace(/\/+$/, "");
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "ViaX-Scout/8.0 (geocodebr-keepalive)",
  };
  const hf = (process.env.GEOCODEBR_HF_TOKEN ?? "").trim();
  if (hf) headers["Authorization"] = `Bearer ${hf}`;
  return headers;
}

async function pingHealth(timeoutMs: number): Promise<boolean> {
  const url = `${geocodebrUrl()}/health`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: authHeaders(), signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

let _timer: ReturnType<typeof setInterval> | null = null;

export function startGeocodebrKeepalive(): void {
  const url = geocodebrUrl();
  if (!url) return;

  // Warm-up inicial: aguarda 8s após o servidor subir para não competir
  // com a inicialização do banco e das rotas.
  setTimeout(async () => {
    logger.info({ url }, "geocodebr keep-alive: warm-up inicial");
    const ok = await pingHealth(WARMUP_TIMEOUT_MS);
    logger.info({ url, ok }, "geocodebr keep-alive: warm-up concluído");
  }, 8_000);

  // Ping periódico a cada 4 minutos
  _timer = setInterval(async () => {
    const ok = await pingHealth(KEEPALIVE_TIMEOUT_MS);
    if (!ok) {
      logger.warn({ url }, "geocodebr keep-alive: Space não respondeu — pode estar acordando");
    } else {
      logger.debug({ url }, "geocodebr keep-alive: ping OK");
    }
  }, PING_INTERVAL_MS);

  // Permite que o processo Node.js encerre normalmente sem aguardar o timer
  if (_timer.unref) _timer.unref();
}

export function stopGeocodebrKeepalive(): void {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}
