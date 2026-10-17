import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { puzzle_image_game_enum } from '~/util/types/ai_batch_metadata';
import BatchManagerPage from './-BatchManagerPage';

const batch_manager_search_schema = z.object({
  game: puzzle_image_game_enum.optional().catch(undefined)
});

export const Route = createFileRoute('/padavali/(auth)/_auth/batch_manager/')({
  validateSearch: batch_manager_search_schema,
  head: () => routeHeadFromPageMeta({ title: 'Image batches' }),
  component: BatchManager
});

function BatchManager() {
  const { game } = Route.useSearch();
  return (
    <div className="container mx-auto p-4">
      <BatchManagerPage key={game ?? 'padavali'} initialGame={game ?? 'padavali'} />
    </div>
  );
}
