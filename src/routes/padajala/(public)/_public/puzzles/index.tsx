import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padajala/puzzles` → `/puzzles?game=padajala`. */
export const Route = createFileRoute('/padajala/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/puzzles',
      search: { game: 'padajala' },
      statusCode: 301
    });
  }
});
