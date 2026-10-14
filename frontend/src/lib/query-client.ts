import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/problem';

let _queryClient: QueryClient | null = null;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 5 * 60_000,
        retry: (count, err) => {
          if (err instanceof ApiError && err.status < 500) return false;
          return count < 2;
        },
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/** Get or create the singleton query client (for use outside React) */
export function getQueryClient(): QueryClient {
  if (!_queryClient) {
    _queryClient = createQueryClient();
  }
  return _queryClient;
}

export function setQueryClient(qc: QueryClient): void {
  _queryClient = qc;
}
