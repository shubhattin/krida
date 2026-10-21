import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import HubHomeCompact from '~/components/hub/HubHomeCompact';

const hubRoute = getRouteApi('/_hub');

/** Experiment: compact home without live previews (not indexed). */
export const Route = createFileRoute('/_hub/home-1')({
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }, { title: 'Home 1 experiment | Krida' }]
  }),
  component: Home1
});

function Home1() {
  const data = hubRoute.useLoaderData();
  return <HubHomeCompact data={data} />;
}
