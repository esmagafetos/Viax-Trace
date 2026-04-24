import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiRequest, hasApiUrl } from '@/lib/api';

export type AnalysisItem = {
  id: number;
  userId: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  geocodeSuccess: number | null;
  similarityAvg: number | null;
  processingTimeMs: number | null;
  parserMode: string | null;
  status: string;
  results: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AnalysisHistoryPage = {
  items: AnalysisItem[];
  total: number;
  page: number;
  limit: number;
};

export interface UseAnalysisHistoryOptions {
  page?: number;
  limit?: number;
  /** Override default behaviour (skip when no server URL is configured). */
  enabled?: boolean;
}

/**
 * Paginated wrapper around `GET /api/analyses` — used by the History tab and
 * by the Dashboard "Ver todas" preview. Keeps each page in cache so jumping
 * back is instant; refetches on focus/reconnect via TanStack Query defaults.
 */
export function useAnalysisHistory(
  { page = 1, limit = 10, enabled }: UseAnalysisHistoryOptions = {}
): UseQueryResult<AnalysisHistoryPage, Error> {
  const isReady = enabled ?? hasApiUrl();
  return useQuery<AnalysisHistoryPage, Error>({
    queryKey: ['/api/analyses', { page, limit }],
    queryFn: () =>
      apiRequest<AnalysisHistoryPage>(
        `/api/analyses?page=${page}&limit=${limit}`
      ),
    enabled: isReady,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
