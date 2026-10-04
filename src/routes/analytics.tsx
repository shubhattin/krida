import { createFileRoute, redirect } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';
import AnalyticsPage from './-AnalyticsPage';

export const Route = createFileRoute('/analytics')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Analytics | Krida',
      project: 'landing_page',
      description: 'Play volume and signed-in player analytics across Padāvalī and Padajāla.',
      robots: 'noindex'
    }),
  component: AnalyticsPage
});
