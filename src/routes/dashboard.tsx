import { createFileRoute } from '@tanstack/react-router';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import DashboardPage from './-DashboardPage';

export const Route = createFileRoute('/dashboard')({
  // Guests get a sign-in preview instead of a redirect.
  beforeLoad: async () => {
    const session = await getUserSession$();
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Dashboard | Krida',
      project: 'landing_page',
      description: 'Your Padāvalī and Padajāla play stats, best scores, and recent puzzles.'
    }),
  component: DashboardPage
});
