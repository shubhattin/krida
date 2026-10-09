import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameAnalyticsRoutePage } from '~/components/pages/simple_game/SimpleGameAdminPages';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';

export const Route = createFileRoute('/surUpa/(auth)/_auth/analytics/')({
  head: () =>
    routeHeadFromPageMeta({ title: 'Surūpa Analytics', project: 'surupa', robots: 'noindex' }),
  component: AnalyticsRoute
});

function AnalyticsRoute() {
  return <SimpleGameAnalyticsRoutePage kind="surupa" />;
}
