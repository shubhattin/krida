import { createFileRoute } from '@tanstack/react-router';
import { CollectionEditPage } from '~/components/pages/catalog/CollectionEditPage';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';

export const Route = createFileRoute('/padavali/(auth)/_auth/collections/$uid')({
  head: () => routeHeadFromPageMeta({ title: 'Edit collection' }),
  component: PadavaliCollectionRoute
});

function PadavaliCollectionRoute() {
  const { uid } = Route.useParams();
  return <CollectionEditPage uid={uid} backTo="/padavali/list" />;
}
