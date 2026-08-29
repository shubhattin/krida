import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { runLoaderEffect } from '~/effect/run';
import { ListedCrosswordPuzzles } from './-ListedCrosswordPuzzles';

const loader$ = createServerFn({ method: 'GET' }).handler(async () => {
  const listed_puzzles = await runLoaderEffect(
    CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS)
  );

  return { listed_puzzles };
});

export const Route = createFileRoute('/padajala/(public)/_public/puzzles/')({
  loader: () => loader$(),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Crossword Puzzles',
      description: 'Browse and play all available crossword puzzles',
      project: 'padajala'
    }),
  component: CrosswordPuzzlesPage
});

function CrosswordPuzzlesPage() {
  const { listed_puzzles } = Route.useLoaderData();

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-150 w-200 -translate-x-1/2 rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)'
        }}
      />
      <ListedCrosswordPuzzles listed_puzzles={listed_puzzles} />
    </main>
  );
}
