import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padavali/puzzles` → `/explore?game=padavali`. */
export const Route = createFileRoute('/padavali/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/explore',
      search: { game: 'padavali' },
      statusCode: 301
    });
  }
});
