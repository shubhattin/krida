import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/padajala/(auth)/_auth/batch_manager/')({
  beforeLoad: () => {
    throw redirect({ to: '/padavali/batch_manager', search: { game: 'padajala' } });
  }
});
