import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/surupa/puzzles` → `/puzzles?game=surupa`. */
export const Route = createFileRoute('/surupa/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/puzzles',
      search: { game: 'surupa' },
      statusCode: 301
    });
  }
});
