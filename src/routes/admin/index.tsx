import { createFileRoute } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import AdminPage from './-AdminPage';

export const Route = createFileRoute('/admin/')({
  head: () =>
    routeHeadFromPageMeta({
      title: 'Admin | Krida',
      project: 'landing_page',
      description: 'Central admin hub for puzzles, schedules, analytics, collections, and tags.',
      robots: 'noindex'
    }),
  component: AdminPage
});
