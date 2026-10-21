'use client';

import { useContext, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ChevronRight, Play, Puzzle } from 'lucide-react';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { AppContext } from '~/components/AppDataContext';
import { GameAppIcon } from '~/components/GameAppIcon';
import { HUB_GAME_LIST, HUB_GAMES } from './hub_games';
import { GamePickerChips } from './GamePickerChips';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { HubCollectionCard } from './HubCollectionCard';
import { HubTodayCard } from './HubTodayCard';
import { tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';

/**
 * HOME-3 experiment: stacked-icon hero + list-style game launcher.
 * - Top-left hero reuses the overlapping game-icon stack from the main home.
 * - Games are a single divided list (no cards, no previews) with a stats line.
 * - Standard max-w-6xl container; denser puzzle grid below.
 */
export default function HubHomeStacked({ data }: { data: HubData }) {
  const { puzzles } = useHubPuzzles(data);
  const [game, setGame] = useState<'all' | GameKind>('all');
  const { script, setScript } = useContext(AppContext);
  const counts = useMemo(() => {
    const c = {
      all: puzzles.length,
      padavali: 0,
      padajala: 0,
      dvayi: 0,
      bhramita: 0,
      surupa: 0,
      anveshi: 0
    } satisfies Record<'all' | GameKind, number>;
    for (const p of puzzles) c[p.game] += 1;
    return c;
  }, [puzzles]);
  const visible = (game === 'all' ? puzzles : puzzles.filter((p) => p.game === game)).slice(0, 12);
  const tags = tagsByPopularity(puzzles).slice(0, 24);
  const todayGames = (['padavali', 'padajala'] as const)
    .map((kind) => HUB_GAMES[kind])
    .filter((g) => data[g.kind].today);

  return (
    <div className="relative overflow-x-clip">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6 sm:py-8">
        {/* Hero: overlapping game-icon stack, top-left */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex shrink-0" aria-hidden="true">
            {HUB_GAME_LIST.map((meta, index) => (
              <GameAppIcon
                key={meta.kind}
                game={meta.kind}
                name={meta.name}
                size="md"
                className={cn(index > 0 && '-ml-3', index > 3 && 'max-sm:hidden')}
              />
            ))}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              <span className="krida-hero-wordmark">Krida</span>
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Sanskrit Games — six ways to play, learn, grow.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ScriptSelector script={script} onScriptChange={setScript} compact />
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              render={<Link to="/puzzles" className="inline-flex items-center gap-1.5" />}
            >
              <Puzzle className="size-3.5" />
              All puzzles
            </Button>
          </div>
        </header>

        {/* Stats strip */}
        <p className="-mt-6 text-xs font-semibold text-slate-400 tabular-nums">
          {counts.all} puzzles · {HUB_GAME_LIST.length} games · {data.collections.length}{' '}
          collections
        </p>

        {/* Games: single divided list, no cards or previews */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Games
          </h2>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-xs backdrop-blur-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900/60">
            {HUB_GAME_LIST.map((meta) => (
              <Link
                key={meta.kind}
                to="/puzzles"
                search={{ game: meta.kind }}
                className="group flex min-w-0 items-center gap-3 px-3 py-2.5 no-underline transition-colors duration-150 hover:bg-slate-50 sm:px-4 sm:py-3 dark:hover:bg-slate-800/60"
              >
                <GameAppIcon game={meta.kind} name={meta.name} size="sm" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                    {meta.name}
                    <span className="ml-2 text-xs font-semibold text-slate-400">
                      {meta.subtitle}
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 tabular-nums group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300">
                  {counts[meta.kind] ?? 0}
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600" />
              </Link>
            ))}
          </div>
        </section>

        {todayGames.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Today
            </h2>
            <div
              className={cn('grid gap-4', todayGames.length > 1 ? 'lg:grid-cols-2' : 'max-w-xl')}
            >
              {todayGames.map((g) => (
                <HubTodayCard
                  key={g.kind}
                  game={g}
                  puzzle={g.kind === 'padavali' ? data.padavali.today : data.padajala.today}
                  nextStart={
                    g.kind === 'padavali' ? data.padavali.next_start : data.padajala.next_start
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Puzzles */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Puzzles
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Recent puzzles from every game
              </p>
            </div>
            <Button
              nativeButton={false}
              variant="ghost"
              size="sm"
              render={<Link to="/puzzles" className="inline-flex items-center gap-1" />}
            >
              View all
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
          <GamePickerChips games={GAME_KINDS} value={game} onChange={setGame} counts={counts} />
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No puzzles to show yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visible.map((puzzle) => (
                <HubPuzzleCard key={puzzle.key} puzzle={puzzle} compact />
              ))}
            </div>
          )}
        </section>

        {data.collections.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Collections
              </h2>
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.collections.slice(0, 3).map((collection) => (
                <HubCollectionCard key={collection.uid} collection={collection} />
              ))}
            </div>
          </section>
        ) : null}

        {tags.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to="/puzzles"
                  search={{ tag: tag.slug }}
                  className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm no-underline shadow-xs transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/30"
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

        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Play className="size-3.5" />
          Experiment home-3 — stacked-icon hero, list launcher.
        </p>
      </div>
    </div>
  );
}
