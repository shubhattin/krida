import { type Metadata } from 'next';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { NoScheduledCrossword } from '~/components/pages/cross_word/NoScheduledCrossword';
import MainPageCrossword from '~/components/pages/cross_word/MainPageCrossword';

export const dynamic = 'force-dynamic';

export default async function CrosswordHomePage() {
  const [current_schedule, next_schedule, listed_puzzles] = await Promise.all([
    CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS),
    CACHE.crossword.next_schedule.get(NO_CACHE_PARAMS),
    CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS)
  ]);

  if (!current_schedule) {
    return (
      <main className="relative min-h-dvh overflow-x-clip">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)'
          }}
        />
        <NoScheduledCrossword next_schedule={next_schedule} listed_puzzles={listed_puzzles} />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)'
        }}
      />
      <MainPageCrossword word_puzzle={current_schedule.puzzle} />
    </main>
  );
}

export const metadata: Metadata = {
  ...getMetadata({
    title: 'Padajāla',
    description:
      'Best Sanskrit Crossword Puzzle Online. Tests your vocabulary and creativity. Expand your vocabulary and challenge your friends to try and beat your score.'
  }),
  keywords:
    'Sanskrit, learning, games, Padajāla, crossword puzzle, Devanagari, Telugu, Kannada, Gujarati, Bengali, Odia, Indian scripts'
};
