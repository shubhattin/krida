import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/padavali/(auth)/_auth/schedules/add/')({
  beforeLoad: () => {
    throw redirect({ to: '/schedules' });
  }
});
