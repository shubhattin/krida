import { type Metadata } from 'next';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { NoScheduledCrossword } from '~/components/pages/cross_word/NoScheduledCrossword';
import MainPageCrossword from '~/components/pages/cross_word/MainPageCrossword';
import { GameCrossPromo } from '~/components/GameCrossPromo';

export const dynamic = 'force-dynamic';

export default async function CrosswordHomePage() {
  const [current_schedule, next_schedule, listed_puzzles] = await Promise.all([
    CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS),
    CACHE.crossword.next_schedule.get(NO_CACHE_PARAMS),
    CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS)
  ]);

  if (!current_schedule) {
    return (
      <main className="relative min-h-dvh overflow-x-clip bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <NoScheduledCrossword next_schedule={next_schedule} listed_puzzles={listed_puzzles} />
        <div className="mx-auto max-w-4xl px-4 pb-12">
          <GameCrossPromo promote="padavali" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <MainPageCrossword word_puzzle={current_schedule.puzzle} />
      <div className="mx-auto max-w-4xl px-4 pb-12">
        <GameCrossPromo promote="padavali" />
      </div>
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
