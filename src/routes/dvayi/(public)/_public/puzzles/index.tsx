import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/dvayi/puzzles` → `/puzzles?game=dvayi`. */
export const Route = createFileRoute('/dvayi/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/puzzles',
      search: { game: 'dvayi' },
      statusCode: 301
    });
  }
});
