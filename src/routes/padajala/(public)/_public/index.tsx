import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/padajala` → hub home puzzles section (`/?game=padajala#padajala`). */
export const Route = createFileRoute('/padajala/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { game: 'padajala' }, hash: 'padajala', statusCode: 301 });
  }
});
