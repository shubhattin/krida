import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/padajala/puzzles` → `/explore?game=crossword`. */
export const Route = createFileRoute('/padajala/(public)/_public/puzzles/')({
  beforeLoad: () => {
    throw redirect({
      to: '/explore',
      search: { game: 'crossword' },
      statusCode: 301
    });
  }
});
