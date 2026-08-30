import { QueryClient } from '@tanstack/react-query';
import ms from 'ms';

export const STALE_TIME = ms('15mins');

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME
      }
    }
  });
}
