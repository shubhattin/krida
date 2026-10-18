import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/padajala/(auth)/_auth/schedules/add/')({
  beforeLoad: () => {
    throw redirect({ to: '/schedules', search: { kinds: ['crossword'] } });
  }
});
