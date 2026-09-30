import { createFileRoute } from '@tanstack/react-router';
import { CollectionEditPage } from '~/components/pages/catalog/CollectionEditPage';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';

export const Route = createFileRoute('/padajala/(auth)/_auth/collections/$uid')({
  head: () => routeHeadFromPageMeta({ title: 'Edit collection', project: 'padajala' }),
  component: PadajalaCollectionRoute
});

function PadajalaCollectionRoute() {
  const { uid } = Route.useParams();
  return <CollectionEditPage uid={uid} backTo="/padajala/list" />;
}
