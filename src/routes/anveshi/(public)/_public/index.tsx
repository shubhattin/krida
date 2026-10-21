import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/anveshi` → hub home puzzles section (`/?game=anveshi#anveshi`). */
export const Route = createFileRoute('/anveshi/(public)/_public/')({
  beforeLoad: () => {
    throw redirect({ to: '/', search: { game: 'anveshi' }, hash: 'anveshi', statusCode: 301 });
  }
});
