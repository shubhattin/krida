'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';

/**
 * Mark every `user.get_dashboard` cache stale (all / padavali / padajala).
 * Does not refetch now — the chip and dashboard fetch on next open/visit.
 */
export function useInvalidateUserDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      ...trpc.user.get_dashboard.queryFilter(),
      refetchType: 'none'
    });
}
