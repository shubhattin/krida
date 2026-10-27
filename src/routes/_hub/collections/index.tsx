import { createFileRoute, redirect } from '@tanstack/react-router';

/** Short alias `/collections` → canonical `/puzzles?view=collections` (see #134). */
export const Route = createFileRoute('/_hub/collections/')({
  beforeLoad: () => {
    throw redirect({
      to: '/puzzles',
      search: { view: 'collections' as const },
      statusCode: 301
    });
  }
});
