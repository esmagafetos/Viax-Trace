import { Router, type IRouter } from "express";
import { eq, desc, and, count, avg, sum } from "drizzle-orm";
import { db, analysesTable } from "@workspace/db";
import { CreateAnalysisBody, ListAnalysesQueryParams, GetAnalysisParams, DeleteAnalysisParams } from "@workspace/api-zod";

const router: IRouter = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  return userId;
}

function formatAnalysis(a: typeof analysesTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    fileName: a.fileName,
    totalAddresses: a.totalAddresses,
    nuances: a.nuances,
    geocodeSuccess: a.geocodeSuccess,
    similarityAvg: a.similarityAvg,
    processingTimeMs: a.processingTimeMs,
    parserMode: a.parserMode,
    status: a.status,
    results: a.results,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

router.get("/analyses", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const params = ListAnalysesQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = params.success ? (params.data.limit ?? 10) : 10;
  const offset = (page - 1) * limit;

  const [totalResult] = await db
    .select({ count: count() })
    .from(analysesTable)
    .where(eq(analysesTable.userId, userId));

  const items = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.userId, userId))
    .orderBy(desc(analysesTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    items: items.map(formatAnalysis),
    total: totalResult.count,
    page,
    limit,
  });
});

router.post("/analyses", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [analysis] = await db
    .insert(analysesTable)
    .values({ userId, ...parsed.data })
    .returning();

  res.status(201).json(formatAnalysis(analysis));
});

router.get("/analyses/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.id, id), eq(analysesTable.userId, userId)))
    .limit(1);

  if (!analysis) {
    res.status(404).json({ error: "Análise não encontrada." });
    return;
  }

  res.json(formatAnalysis(analysis));
});

router.delete("/analyses/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const [analysis] = await db
    .delete(analysesTable)
    .where(and(eq(analysesTable.id, id), eq(analysesTable.userId, userId)))
    .returning();

  if (!analysis) {
    res.status(404).json({ error: "Análise não encontrada." });
    return;
  }

  res.sendStatus(204);
});

export default router;
