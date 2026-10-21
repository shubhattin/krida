import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/bhramita/puzzles` → `/puzzles?game=bhramita`. */
export const Route = createFileRoute('/bhramita/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/puzzles',
      search: { game: 'bhramita' },
      statusCode: 301
    });
  }
});
