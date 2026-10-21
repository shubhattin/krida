'use client';

import { useContext, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Play } from 'lucide-react';
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
import { Button } from '~/components/ui/button';

/**
 * HOME-2 experiment: dashboard with a sticky side rail.
 * - Full-bleed wide container (max-w-[1440px]); content + 340px rail on desktop.
 * - Left: game strip (no previews), dense puzzle grid, collections.
 * - Right (sticky): Today, then Topics — no more endless single-column stacking.
 */
export default function HubHomeSidebar({ data }: { data: HubData }) {
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
  const visible = (game === 'all' ? puzzles : puzzles.filter((p) => p.game === game)).slice(0, 9);
  const tags = tagsByPopularity(puzzles).slice(0, 24);
  const todayGames = (['padavali', 'padajala'] as const)
    .map((kind) => HUB_GAMES[kind])
    .filter((g) => data[g.kind].today);

  return (
    <div className="relative overflow-x-clip">
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* Slim dashboard header */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            <span className="krida-hero-wordmark">Krida</span>
          </h1>
          <p className="hidden text-sm text-slate-500 md:block dark:text-slate-400">
            Six Sanskrit games — pick one and play.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <ScriptSelector script={script} onScriptChange={setScript} compact />
            <Button
              nativeButton={false}
              size="sm"
              render={<Link to="/puzzles" className="inline-flex items-center gap-1.5" />}
            >
              Browse all
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main column */}
          <div className="flex min-w-0 flex-col gap-8">
            {/* Game strip: one compact row per game, no previews */}
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Games</h2>
              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                {HUB_GAME_LIST.map((meta) => (
                  <Link
                    key={meta.kind}
                    to="/puzzles"
                    search={{ game: meta.kind }}
                    className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 no-underline shadow-xs transition-all duration-200 hover:-translate-y-px hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
                  >
                    <GameAppIcon game={meta.kind} name={meta.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                      {meta.name}
                      <span className="ml-1.5 font-semibold text-slate-400">{meta.subtitle}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 tabular-nums group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300">
                      {counts[meta.kind] ?? 0}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* Puzzles */}
            <section className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    Fresh puzzles
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Recent across every game
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
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.collections.slice(0, 4).map((collection) => (
                    <HubCollectionCard key={collection.uid} collection={collection} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Sticky side rail */}
          <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20">
            {todayGames.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                  Live today
                </h2>
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
              </section>
            ) : null}

            {tags.length > 0 ? (
              <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">
                  Topics
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Link
                      key={tag.id}
                      to="/puzzles"
                      search={{ tag: tag.slug }}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs no-underline transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/30"
                    >
                      {tag.slug}
                      <span className="ml-1 text-[10px] text-slate-400 tabular-nums">
                        {tag.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Play className="size-3.5" />
              Experiment home-2 — dashboard with sticky rail.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
