import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameAnalyticsRoutePage } from '~/components/pages/simple_game/SimpleGameAdminPages';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';

export const Route = createFileRoute('/bhramita/(auth)/_auth/analytics/')({
  head: () =>
    routeHeadFromPageMeta({ title: 'Bhramitā Analytics', project: 'bhramita', robots: 'noindex' }),
  component: AnalyticsRoute
});

function AnalyticsRoute() {
  return <SimpleGameAnalyticsRoutePage kind="bhramita" />;
}
