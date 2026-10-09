import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padavali/puzzles` → `/puzzles?game=padavali`. */
export const Route = createFileRoute('/padavali/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/puzzles',
      search: { game: 'padavali' },
      statusCode: 301
    });
  }
});
