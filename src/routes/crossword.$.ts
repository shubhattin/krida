import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/crossword/*` → `/padajala/*`. */
export const Route = createFileRoute('/crossword/$')({
  beforeLoad: ({ params }) => {
    const splat = params._splat ?? '';
    throw redirect({
      href: `/padajala${splat ? `/${splat}` : ''}`,
      statusCode: 301
    });
  }
});
