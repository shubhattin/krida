import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { NoScheduledCrossword } from '~/components/pages/cross_word/NoScheduledCrossword';
import MainPageCrossword from '~/components/pages/cross_word/MainPageCrossword';
import { GameCrossPromo } from '~/components/GameCrossPromo';
import { runLoaderEffect } from '~/effect/run';

const loader$ = createServerFn({ method: 'GET' }).handler(async () => {
  const [current_schedule, next_schedule, listed_puzzles] = await Promise.all([
    runLoaderEffect(CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.crossword.next_schedule.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS))
  ]);

  return { current_schedule, next_schedule, listed_puzzles };
});

export const Route = createFileRoute('/padajala/(public)/_public/')({
  loader: () => loader$(),
  head: () =>
    routeHeadFromPageMeta({
      title: 'Padajāla',
      project: 'padajala',
      description:
        'Best Sanskrit Crossword Puzzle Online. Tests your vocabulary and creativity. Expand your vocabulary and challenge your friends to try and beat your score.'
    }),
  component: CrosswordHomePage
});

function CrosswordHomePage() {
  const { current_schedule, next_schedule, listed_puzzles } = Route.useLoaderData();

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {current_schedule ? (
        <MainPageCrossword word_puzzle={current_schedule.puzzle} />
      ) : (
        <NoScheduledCrossword next_schedule={next_schedule} listed_puzzles={listed_puzzles} />
      )}
      <div className="mx-auto max-w-4xl px-4 pb-12">
        <GameCrossPromo promote="padavali" />
      </div>
    </main>
  );
}
