'use client';

import { useContext, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, LayoutGrid, Puzzle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Image } from '@unpic/react';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { AppContext } from '~/components/AppDataContext';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { HUB_GAMES, HUB_GAME_LIST } from './hub_games';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { HubCollectionCard } from './HubCollectionCard';
import { HubTodayCard } from './HubTodayCard';
import { HubGameShowcase } from './HubGameShowcase';
import { tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import type { GameKind } from '~/util/catalog/tags';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';

function HubSectionHeading({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-pretty text-slate-900 sm:text-2xl dark:text-slate-50">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

const PUZZLE_FILTERS: {
  value: 'all' | GameKind;
  label: string;
  icon?: (typeof GAME_APP_ICON_SRC)[keyof typeof GAME_APP_ICON_SRC];
}[] = [
  { value: 'all', label: 'All' },
  {
    value: 'padavali',
    label: HUB_GAMES.padavali.name,
    icon: GAME_APP_ICON_SRC[HUB_GAMES.padavali.icon]
  },
  {
    value: 'crossword',
    label: HUB_GAMES.crossword.name,
    icon: GAME_APP_ICON_SRC[HUB_GAMES.crossword.icon]
  }
];

function RecentlyAdded({ puzzles }: { puzzles: ReturnType<typeof useHubPuzzles>['puzzles'] }) {
  const [game, setGame] = useState<'all' | GameKind>('all');
  const { script, setScript } = useContext(AppContext);
  const reduceMotion = useReducedMotion();
  const visible = (
    game === 'all' ? puzzles : puzzles.filter((puzzle) => puzzle.game === game)
  ).slice(0, 8);

  return (
    <section id="puzzles" className="flex scroll-mt-24 flex-col gap-4">
      <HubSectionHeading
        title="Puzzles"
        description="Recent puzzles from every game"
        action={
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to="/puzzles" className="inline-flex items-center gap-1.5" />}
          >
            <Puzzle className="size-3.5" />
            All puzzles
            <ArrowRight className="size-3.5" />
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {PUZZLE_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={game === option.value}
            onClick={() => setGame(option.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200',
              'focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none',
              game === option.value
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-600'
            )}
          >
            {option.icon ? (
              <Image src={option.icon} alt="" width={14} height={14} className="size-3.5" />
            ) : (
              <LayoutGrid className="size-3.5" aria-hidden />
            )}
            {option.label}
          </button>
        ))}
        <div className="ml-auto">
          <ScriptSelector script={script} onScriptChange={setScript} />
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No puzzles to show yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {visible.map((puzzle, index) => (
            <motion.div
              key={puzzle.key}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: reduceMotion ? 0 : index * 0.04 }}
            >
              <HubPuzzleCard puzzle={puzzle} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Game-launcher home: compact intro into showcases, then today's sessions when live. */
export default function HubHome({ data }: { data: HubData }) {
  const { puzzles } = useHubPuzzles(data);
  const tags = tagsByPopularity(puzzles).slice(0, 24);
  const reduceMotion = useReducedMotion();
  const todayGames = HUB_GAME_LIST.filter((game) =>
    game.kind === 'padavali' ? data.padavali.today : data.crossword.today
  );

  return (
    <div className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 size-64 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute top-28 right-1/5 size-72 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/8" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-6 sm:gap-14 sm:py-8">
        <HubGameShowcase />

        {todayGames.length > 0 ? (
          <section className="flex flex-col gap-4">
            <HubSectionHeading
              title="Today"
              description={
                todayGames.length === 1
                  ? 'Live right now, with a countdown to the next rotation'
                  : 'Live sessions with a countdown to the next rotation'
              }
            />
            <div
              className={cn('grid gap-4', todayGames.length > 1 ? 'lg:grid-cols-2' : 'max-w-xl')}
            >
              {todayGames.map((game) => (
                <HubTodayCard
                  key={game.kind}
                  game={game}
                  puzzle={game.kind === 'padavali' ? data.padavali.today : data.crossword.today}
                  nextStart={
                    game.kind === 'padavali' ? data.padavali.next_start : data.crossword.next_start
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {data.collections.length > 0 ? (
          <section className="flex flex-col gap-4">
            <HubSectionHeading
              title="Collections"
              description="Curated mixed-game playlists"
              action={
                <Button
                  nativeButton={false}
                  variant="ghost"
                  size="sm"
                  render={
                    <Link
                      to="/puzzles"
                      search={{ view: 'collections' }}
                      className="inline-flex items-center gap-1"
                    />
                  }
                >
                  All collections
                  <ArrowRight className="size-3.5" />
                </Button>
              }
            />
            <div className="flex snap-x snap-mandatory scrollbar-none gap-4 overflow-x-auto pb-2">
              {data.collections.map((collection, index) => (
                <motion.div
                  key={collection.uid}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: reduceMotion ? 0 : index * 0.05 }}
                  className="w-64 shrink-0 snap-start sm:w-72"
                >
                  <HubCollectionCard collection={collection} />
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}

        {tags.length > 0 ? (
          <section className="flex flex-col gap-4">
            <HubSectionHeading title="Topics" description="Jump into a theme across every game" />
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to="/puzzles"
                  search={{ tag: tag.slug }}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm no-underline shadow-xs transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/30"
                >
                  {tag.slug}
                  <span className="ml-1.5 text-[11px] text-slate-400 tabular-nums">
                    {tag.count}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <RecentlyAdded puzzles={puzzles} />
      </div>
    </div>
  );
}
