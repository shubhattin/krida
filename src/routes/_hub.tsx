import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppContextProvider } from '~/components/AppDataContext';
import { hubDataQueryOptions } from '~/components/hub/hub_query';
import { getScript$ } from '~/lib/cache_server_route_data';
import HubShell from '~/components/hub/HubShell';

/** Pathless layout for the unified, cross-game public pages (`/`, `/puzzles`, `/collections/*`). */
export const Route = createFileRoute('/_hub')({
  // Data lives in the query cache (dehydrated with the SSR page), so client navigations and
  // preloads only refetch once it is stale. The loader returns just the cache key.
  loader: async ({ context }) => {
    const script = getScript$();
    await context.queryClient.ensureQueryData({
      ...hubDataQueryOptions(script),
      revalidateIfStale: true
    });
    return { script };
  },
  component: HubLayout
});

function HubLayout() {
  const { script } = Route.useLoaderData();

  return (
    <AppContextProvider initialScript={script}>
      <HubShell>
        <Outlet />
      </HubShell>
    </AppContextProvider>
  );
}
