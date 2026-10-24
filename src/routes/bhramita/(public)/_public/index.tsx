import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/bhramita` → hub home puzzles section (`/?game=bhramita#bhramita`). */
export const Route = createFileRoute('/bhramita/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { game: 'bhramita' }, hash: 'bhramita', statusCode: 301 });
  }
});
