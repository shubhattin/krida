import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/padavali` → hub home puzzles section (`/?game=padavali#padavali`). */
export const Route = createFileRoute('/padavali/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { game: 'padavali' }, hash: 'padavali', statusCode: 301 });
  }
});
