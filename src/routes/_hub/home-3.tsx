import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import HubHomeStacked from '~/components/hub/HubHomeStacked';

const hubRoute = getRouteApi('/_hub');

/** Experiment: stacked-icon hero with a list-style launcher (not indexed). */
export const Route = createFileRoute('/_hub/home-3')({
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }, { title: 'Home 3 experiment | Krida' }]
  }),
  component: Home3
});

function Home3() {
  const data = hubRoute.useLoaderData();
  return <HubHomeStacked data={data} />;
}
