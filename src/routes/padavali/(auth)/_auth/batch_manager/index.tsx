import { createFileRoute } from '@tanstack/react-router';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import BatchManagerPage from './-BatchManagerPage';

export const Route = createFileRoute('/padavali/(auth)/_auth/batch_manager/')({
  head: () => routeHeadFromPageMeta({ title: 'Image batches' }),
  component: BatchManager
});

function BatchManager() {
  return (
    <div className="container mx-auto p-4">
      <BatchManagerPage />
    </div>
  );
}
