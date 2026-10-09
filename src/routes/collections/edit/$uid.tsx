import { createFileRoute, redirect } from '@tanstack/react-router';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubHeader } from '~/components/hub/HubHeader';
import { CollectionEditPage } from '~/components/pages/catalog/CollectionEditPage';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';

export const Route = createFileRoute('/collections/edit/$uid')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () => routeHeadFromPageMeta({ title: 'Edit collection', robots: 'noindex' }),
  component: CollectionEditRoute
});

function CollectionEditRoute() {
  const { uid } = Route.useParams();
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />
      <div className="mx-2 flex-1">
        <CollectionEditPage uid={uid} />
      </div>
    </div>
  );
}
