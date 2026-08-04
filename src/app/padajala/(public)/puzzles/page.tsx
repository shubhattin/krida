import { type Metadata } from 'next';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { ListedCrosswordPuzzles } from './ListedCrosswordPuzzles';
import { runServerEffect } from '~/effect/run';

export default async function CrosswordPuzzlesPage() {
  const listed_puzzles = await runServerEffect(
    CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS)
  );

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)'
        }}
      />
      <ListedCrosswordPuzzles listed_puzzles={listed_puzzles} />
    </main>
  );
}

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Crossword Puzzles',
    description: 'Browse and play all available crossword puzzles',
    project: 'padajala'
  })
};
