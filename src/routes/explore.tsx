import { createFileRoute, redirect } from '@tanstack/react-router';

/** Legacy `/explore` → `/puzzles`, keeping query params. */
export const Route = createFileRoute('/explore')({
  beforeLoad: ({ location }) => {
    const qs = location.searchStr;
    const suffix = !qs ? '' : qs.startsWith('?') ? qs : `?${qs}`;
    throw redirect({
      href: `/puzzles${suffix}`,
      statusCode: 301
    });
  }
});
