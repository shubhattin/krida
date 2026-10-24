import { createFileRoute } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { AgentsLayout } from '~/components/pages/agents/AgentsLayout';

export const Route = createFileRoute('/admin/agents')({
  head: () =>
    routeHeadFromPageMeta({
      title: 'Agents | Krida Admin',
      project: 'landing_page',
      description: 'Internal AI agents for querying data and creating puzzles.',
      robots: 'noindex'
    }),
  component: AgentsLayout
});
