import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiRequest, hasApiUrl } from '@/lib/api';

export type DashboardSummary = {
  totalAnalyses: number;
  totalAddressesProcessed: number;
  avgNuanceRate: number;
  avgGeocodeSuccess: number;
  avgSimilarity: number;
  analysesThisMonth: number;
};

export type RecentAnalysis = {
  id: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  status: string;
  createdAt: string;
};

export type DashboardFinancial = {
  rotasCicloAtual: number;
  receitaEstimada: number;
  despesasFixas: number;
  lucroBruto: number;
  metaRotas: number | null;
  percentualMeta: number | null;
  valorPorRota: number | null;
  cicloPagamentoDias: number;
  inicioDoCliclo: string;
  fimDoCiclo: string;
  graficoDiario: { data: string; rotas: number; receita: number }[];
};

export interface UseDashboardData {
  summary: UseQueryResult<DashboardSummary, Error>;
  recent: UseQueryResult<RecentAnalysis[], Error>;
  financial: UseQueryResult<DashboardFinancial, Error>;
  /** True while every panel is on its first load (no cached data yet). */
  isInitialLoading: boolean;
  /** True if at least one panel failed and we have no cached data to fall back on. */
  isError: boolean;
  /** True while at least one panel is silently revalidating. */
  isRefetching: boolean;
  /** Re-runs every panel in parallel. */
  refetchAll: () => Promise<void>;
}

/**
 * Mirrors the three panels rendered by the web Dashboard
 * (`useGetDashboardSummary`, `useGetRecentAnalyses`, `useGetDashboardFinancial`),
 * returning a single composable shape for the screen to consume.
 *
 * Skips fetching entirely until the user has configured a server URL —
 * otherwise the requests would error out before Setup.
 */
export function useDashboardData(): UseDashboardData {
  const enabled = hasApiUrl();

  const summary = useQuery<DashboardSummary, Error>({
    queryKey: ['/api/dashboard/summary'],
    queryFn: () => apiRequest<DashboardSummary>('/api/dashboard/summary'),
    enabled,
    staleTime: 30_000,
  });

  const recent = useQuery<RecentAnalysis[], Error>({
    queryKey: ['/api/dashboard/recent'],
    queryFn: () => apiRequest<RecentAnalysis[]>('/api/dashboard/recent'),
    enabled,
    staleTime: 30_000,
  });

  const financial = useQuery<DashboardFinancial, Error>({
    queryKey: ['/api/dashboard/financial'],
    queryFn: () => apiRequest<DashboardFinancial>('/api/dashboard/financial'),
    enabled,
    staleTime: 30_000,
  });

  const isInitialLoading =
    (summary.isLoading && !summary.data) ||
    (recent.isLoading && !recent.data) ||
    (financial.isLoading && !financial.data);

  const isError = !!summary.error || !!recent.error || !!financial.error;
  const isRefetching = summary.isRefetching || recent.isRefetching || financial.isRefetching;

  const refetchAll = async () => {
    await Promise.all([summary.refetch(), recent.refetch(), financial.refetch()]);
  };

  return { summary, recent, financial, isInitialLoading, isError, isRefetching, refetchAll };
}
