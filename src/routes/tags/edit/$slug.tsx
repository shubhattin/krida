import { createFileRoute, redirect } from '@tanstack/react-router';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { HubFooter } from '~/components/hub/HubFooter';
import { HubHeader } from '~/components/hub/HubHeader';
import { TagEditPage } from '~/components/pages/catalog/TagEditPage';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { getUserSession$ } from '~/lib/get_auth_from_cookie';

export const Route = createFileRoute('/tags/edit/$slug')({
  beforeLoad: async () => {
    const session = await getUserSession$();
    if (!session?.user || session.user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
    return { session };
  },
  head: () => routeHeadFromPageMeta({ title: 'Edit tag', robots: 'noindex' }),
  component: TagEditRoute
});

function TagEditRoute() {
  const { slug } = Route.useParams();
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />
      <div className="mx-2 flex-1">
        <TagEditPage slug={slug} />
      </div>
      <HubFooter />
    </div>
  );
}
