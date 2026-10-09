import { createFileRoute, redirect } from '@tanstack/react-router';
import { Layers } from 'lucide-react';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubHeader } from '~/components/hub/HubHeader';
import { AdminCollectionsList } from '~/components/pages/catalog/AdminCollectionsList';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';

export const Route = createFileRoute('/collections/list')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Collections | Krida',
      project: 'landing_page',
      description: 'Manage curated puzzle collections across Padāvalī and Padajāla.',
      robots: 'noindex'
    }),
  component: CollectionsListRoute
});

function CollectionsListRoute() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Layers className="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            Collections
          </h1>
          <p className="text-sm text-muted-foreground">
            Curated puzzle lists shared by Padāvalī and Padajāla.
          </p>
        </div>
        <AdminCollectionsList />
      </main>
    </div>
  );
}
