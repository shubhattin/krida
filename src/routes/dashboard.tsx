import { createFileRoute, redirect } from '@tanstack/react-router';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import DashboardPage from './-DashboardPage';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user) {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Dashboard | Sanskrit Games',
      project: 'landing_page',
      description: 'Your Padāvalī and Padajāla play stats, best scores, and recent puzzles.'
    }),
  component: DashboardPage
});
