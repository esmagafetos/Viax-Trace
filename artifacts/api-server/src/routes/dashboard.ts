import { Router, type IRouter } from "express";
import { eq, desc, count, avg, sum, sql } from "drizzle-orm";
import { db, analysesTable, userSettingsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

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

router.get("/dashboard/financial", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [settings] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);

  const valorPorRota = (settings as any)?.valorPorRota ?? null;
  const cicloPagamentoDias: number = (settings as any)?.cicloPagamentoDias ?? 30;
  const metaMensalRotas = (settings as any)?.metaMensalRotas ?? null;
  const despesasFixasMensais: number = (settings as any)?.despesasFixasMensais ?? 0;

  const now = new Date();
  const inicioCiclo = new Date(now);
  inicioCiclo.setDate(now.getDate() - cicloPagamentoDias + 1);
  inicioCiclo.setHours(0, 0, 0, 0);

  const fimCiclo = new Date(now);
  fimCiclo.setHours(23, 59, 59, 999);

  const analisesCiclo = await db
    .select({ createdAt: analysesTable.createdAt })
    .from(analysesTable)
    .where(
      sql`${analysesTable.userId} = ${userId} AND ${analysesTable.createdAt} >= ${inicioCiclo} AND ${analysesTable.createdAt} <= ${fimCiclo}`
    )
    .orderBy(analysesTable.createdAt);

  const rotasCiclo = analisesCiclo.length;
  const receitaEstimada = valorPorRota !== null ? rotasCiclo * valorPorRota : 0;
  const despesasCiclo = despesasFixasMensais ? (despesasFixasMensais / 30) * cicloPagamentoDias : 0;
  const lucroBruto = receitaEstimada - despesasCiclo;
  const percentualMeta = metaMensalRotas && metaMensalRotas > 0
    ? Math.min(Math.round((rotasCiclo / metaMensalRotas) * 100 * 10) / 10, 999)
    : null;

  const graficoPorDia = new Map<string, { rotas: number; receita: number }>();
  for (let d = new Date(inicioCiclo); d <= fimCiclo; d.setDate(d.getDate() + 1)) {
    graficoPorDia.set(new Date(d).toISOString().substring(0, 10), { rotas: 0, receita: 0 });
  }
  for (const a of analisesCiclo) {
    const key = a.createdAt.toISOString().substring(0, 10);
    const e = graficoPorDia.get(key) ?? { rotas: 0, receita: 0 };
    e.rotas += 1;
    e.receita += valorPorRota ?? 0;
    graficoPorDia.set(key, e);
  }

  const graficoDiario = [...graficoPorDia.entries()].map(([data, v]) => ({
    data,
    rotas: v.rotas,
    receita: Math.round(v.receita * 100) / 100,
  }));

  logger.debug({ userId, rotasCiclo, receitaEstimada, lucroBruto }, "Dashboard financial computed");

  res.json({
    rotasCicloAtual: rotasCiclo,
    receitaEstimada: Math.round(receitaEstimada * 100) / 100,
    despesasFixas: Math.round(despesasCiclo * 100) / 100,
    lucroBruto: Math.round(lucroBruto * 100) / 100,
    metaRotas: metaMensalRotas,
    percentualMeta,
    valorPorRota,
    cicloPagamentoDias,
    inicioDoCliclo: inicioCiclo.toISOString(),
    fimDoCiclo: fimCiclo.toISOString(),
    graficoDiario,
  });
});

export default router;
