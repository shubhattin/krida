import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import HubHomeSidebar from '~/components/hub/HubHomeSidebar';

const hubRoute = getRouteApi('/_hub');

/** Experiment: dashboard home with a sticky side rail (not indexed). */
export const Route = createFileRoute('/_hub/home-2')({
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }, { title: 'Home 2 experiment | Krida' }]
  }),
  component: Home2
});

function Home2() {
  const data = hubRoute.useLoaderData();
  return <HubHomeSidebar data={data} />;
}
