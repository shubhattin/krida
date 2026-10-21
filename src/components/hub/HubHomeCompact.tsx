'use client';

import { useContext, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Play, Puzzle } from 'lucide-react';
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
 * HOME-1 experiment: compact launcher without live previews.
 * - Games are small icon + text + CTA rows (no looping demos).
 * - Wider container (max-w-7xl) with a 3-up game grid on desktop.
 * - Denser puzzle grid (up to 5 across) so big screens show more at once.
 */
export default function HubHomeCompact({ data }: { data: HubData }) {
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
  const visible = (game === 'all' ? puzzles : puzzles.filter((p) => p.game === game)).slice(0, 10);
  const tags = tagsByPopularity(puzzles).slice(0, 24);
  const todayGames = (['padavali', 'padajala'] as const)
    .map((kind) => HUB_GAMES[kind])
    .filter((g) => data[g.kind].today);

  return (
    <div className="relative overflow-x-clip">
      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
        {/* Slim hero: one row, no carousel */}
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            <span className="krida-hero-wordmark">Krida</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sanskrit Games — six ways to play, learn, grow.
          </p>
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

        {/* Games: compact, no live previews */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Games
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HUB_GAME_LIST.map((meta) => (
              <Link
                key={meta.kind}
                to="/puzzles"
                search={{ game: meta.kind }}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3.5 no-underline shadow-xs backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
              >
                <GameAppIcon game={meta.kind} name={meta.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-slate-50">
                    {meta.name}
                    <span className="ml-2 text-xs font-semibold text-slate-400">
                      {meta.subtitle}
                    </span>
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-indigo-500">
                  {counts[meta.kind] ?? 0}
                  <ArrowUpRight className="size-4" />
                </span>
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
              className={cn('grid gap-3', todayGames.length > 1 ? 'lg:grid-cols-2' : 'max-w-2xl')}
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

        {/* Puzzles: denser grid for wide screens */}
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
          Experiment home-1 — compact, no live previews.
        </p>
      </div>
    </div>
  );
}
