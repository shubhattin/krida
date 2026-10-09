import { createFileRoute, redirect } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';
import AdminPage from './-AdminPage';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Admin | Krida',
      project: 'landing_page',
      description: 'Central admin hub for puzzles, schedules, analytics, collections, and tags.',
      robots: 'noindex'
    }),
  component: AdminPage
});
