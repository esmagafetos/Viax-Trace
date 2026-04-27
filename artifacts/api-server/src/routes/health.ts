import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Lightweight diagnostic endpoint that pings each downstream subsystem and
// returns its status. Used to verify after deploy that geocodebr is reachable
// from inside the Render private network.
router.get("/diag", async (_req, res) => {
  const out: Record<string, unknown> = {
    status: "ok",
    time: new Date().toISOString(),
    geocodebr: { configured: false, reachable: false, status: 0, message: "" },
  };

  const url = process.env.GEOCODEBR_URL ?? "";
  if (url) {
    (out.geocodebr as Record<string, unknown>).configured = true;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(`${url.replace(/\/$/, "")}/health`, {
        signal: ctrl.signal,
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

export default router;
