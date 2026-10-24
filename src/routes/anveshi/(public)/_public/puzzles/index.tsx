import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/anveshi/puzzles` → `/puzzles?game=anveshi`. */
export const Route = createFileRoute('/anveshi/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/puzzles',
      search: { game: 'anveshi' },
      statusCode: 301
    });
  }
});
