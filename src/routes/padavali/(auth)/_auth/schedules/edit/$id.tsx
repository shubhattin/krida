import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/padavali/(auth)/_auth/schedules/edit/$id')({
  beforeLoad: () => {
    throw redirect({ to: '/schedules', search: { kinds: ['padavali'] } });
  }
});
