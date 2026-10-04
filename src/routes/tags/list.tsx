import { createFileRoute, redirect } from '@tanstack/react-router';
import { Tag } from 'lucide-react';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';
import { AdminTagsList } from '~/components/pages/catalog/AdminTagsList';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';

export const Route = createFileRoute('/tags/list')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () =>
    routeHeadFromPageMeta({
      title: 'Tags | Krida',
      project: 'landing_page',
      description: 'Browse tags and the puzzles carrying them across Padāvalī and Padajāla.',
      robots: 'noindex'
    }),
  component: TagsListRoute
});

function TagsListRoute() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Tag className="size-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            Tags
          </h1>
          <p className="text-sm text-muted-foreground">
            Every tag, shared by Padāvalī and Padajāla. Select one to see its puzzles.
          </p>
        </div>
        <AdminTagsList />
      </main>
      <HubFooter />
    </div>
  );
}
