import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/dvayi` → hub home puzzles section (`/?game=dvayi#dvayi`). */
export const Route = createFileRoute('/dvayi/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { game: 'dvayi' }, hash: 'dvayi', statusCode: 301 });
  }
});
