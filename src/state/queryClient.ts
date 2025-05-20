import { QueryClient } from '@tanstack/react-query';
import ms from 'ms';

export const STALE_TIME = ms('15mins'); // by default data will stay fresh for 8 minutes

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      enabled: typeof window !== 'undefined',
      staleTime: STALE_TIME
    }
  }
});
