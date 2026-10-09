import { createFileRoute } from '@tanstack/react-router';
import { SimpleGameListRoutePage } from '~/components/pages/simple_game/SimpleGameAdminPages';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';

export const Route = createFileRoute('/surUpa/(auth)/_auth/list/')({
  head: () => routeHeadFromPageMeta({ title: 'Surūpa List', project: 'surupa', robots: 'noindex' }),
  component: ListRoute
});

function ListRoute() {
  return <SimpleGameListRoutePage kind="surupa" />;
}
