import { Router, type IRouter } from "express";
import { eq, desc, count, avg, sum, sql } from "drizzle-orm";
import { db, analysesTable } from "@workspace/db";

const router: IRouter = Router();

function requireAuth(req: any, res: any): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  return userId;
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [stats] = await db
    .select({
      totalAnalyses: count(),
      totalAddressesProcessed: sum(analysesTable.totalAddresses),
      avgNuanceRate: avg(analysesTable.nuances),
      avgGeocodeSuccess: avg(analysesTable.geocodeSuccess),
      avgSimilarity: avg(analysesTable.similarityAvg),
    })
    .from(analysesTable)
    .where(eq(analysesTable.userId, userId));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthStats] = await db
    .select({ count: count() })
    .from(analysesTable)
    .where(
      sql`${analysesTable.userId} = ${userId} AND ${analysesTable.createdAt} >= ${startOfMonth}`
    );

  res.json({
    totalAnalyses: Number(stats.totalAnalyses ?? 0),
    totalAddressesProcessed: Number(stats.totalAddressesProcessed ?? 0),
    avgNuanceRate: Number(stats.avgNuanceRate ?? 0),
    avgGeocodeSuccess: Number(stats.avgGeocodeSuccess ?? 0),
    avgSimilarity: Number(stats.avgSimilarity ?? 0),
    analysesThisMonth: Number(monthStats.count ?? 0),
  });
});

router.get("/dashboard/recent", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const recent = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.userId, userId))
    .orderBy(desc(analysesTable.createdAt))
    .limit(5);

  res.json(
    recent.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      totalAddresses: a.totalAddresses,
      nuances: a.nuances,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

export default router;
