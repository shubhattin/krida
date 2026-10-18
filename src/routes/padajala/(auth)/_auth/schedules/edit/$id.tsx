import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/padajala/(auth)/_auth/schedules/edit/$id')({
  beforeLoad: () => {
    throw redirect({ to: '/schedules', search: { kinds: ['crossword'] } });
  }
});
