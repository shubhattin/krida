'use client';

import { useContext, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Languages, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { GameShowcaseCard, GAMES } from '~/routes/-Landing';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { AppContext } from '~/components/AppDataContext';
import { HUB_GAMES, HUB_GAME_LIST } from './hub_games';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { HubCollectionCard } from './HubCollectionCard';
import { HubTodayCard } from './HubTodayCard';
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
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
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

const FRESH_FILTERS: { value: 'all' | GameKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'padavali', label: HUB_GAMES.padavali.name },
  { value: 'crossword', label: HUB_GAMES.crossword.name }
];

function FreshPuzzles({ puzzles }: { puzzles: ReturnType<typeof useHubPuzzles>['puzzles'] }) {
  const [game, setGame] = useState<'all' | GameKind>('all');
  const { script, setScript } = useContext(AppContext);
  const visible = (
    game === 'all' ? puzzles : puzzles.filter((puzzle) => puzzle.game === game)
  ).slice(0, 8);

  return (
    <section className="flex flex-col gap-4">
      <HubSectionHeading
        title="Fresh puzzles"
        description="Recently listed across every game"
        action={
          <Button
            nativeButton={false}
            variant="ghost"
            size="sm"
            render={<Link to="/explore" className="inline-flex items-center gap-1" />}
          >
            View all
            <ArrowRight className="size-3.5" />
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {FRESH_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setGame(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              game === option.value
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300'
            )}
          >
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
          {visible.map((puzzle) => (
            <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Game-launcher home: today's sessions, showcases, collections, topics, latest puzzles. */
export default function HubHome({ data }: { data: HubData }) {
  const { puzzles } = useHubPuzzles(data);
  const tags = tagsByPopularity(puzzles).slice(0, 24);

  return (
    <div className="relative overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 size-80 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute top-40 right-1/5 size-96 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-500/8" />
        <div className="absolute top-1/2 left-1/3 size-72 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/8" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-14 px-4 py-8 sm:py-10">
        <section className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300">
            <Sparkles className="size-3.5 text-amber-500" />
            Sanskrit learning, playable
          </span>
          <h1 className="max-w-2xl bg-linear-to-r from-slate-900 via-blue-700 to-indigo-600 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl md:text-5xl dark:from-white dark:via-blue-300 dark:to-indigo-400">
            Pick a game. Play today.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            Word search and crossword puzzles for Sanskrit — one launcher for every game,
            collection, and topic.
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Languages className="size-3.5 shrink-0 text-indigo-500" />
            Supports Devanagari, Telugu, Kannada, Gujarati, Bengali, and Odia with live
            transliteration.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <HubSectionHeading
            title="Today's puzzles"
            description="Live sessions with a countdown to the next rotation"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {HUB_GAME_LIST.map((game) => (
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

        <section className="flex flex-col gap-4">
          <HubSectionHeading
            title="Games"
            description="Jump in — more titles will land here later"
          />
          <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            {GAMES.map((game, index) => (
              <GameShowcaseCard key={game.id} game={game} index={index} />
            ))}
          </div>
        </section>

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
                      to="/explore"
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
            <div className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {data.collections.map((collection) => (
                <motion.div
                  key={collection.uid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
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
                  to="/explore"
                  search={{ tag: tag.slug }}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm no-underline shadow-xs transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/30"
                >
                  {tag.name}
                  <span className="ml-1.5 text-[11px] text-slate-400">{tag.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <FreshPuzzles puzzles={puzzles} />
      </div>
    </div>
  );
}
