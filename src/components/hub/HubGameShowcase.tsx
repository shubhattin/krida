'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { AllPuzzlesLink } from '~/components/PuzzleCatalogLink';
import { GameAppIcon } from '~/components/GameAppIcon';
import { HUB_GAME_LIST, type HubGameMeta } from '~/components/hub/hub_games';
import { GameShowcaseCard } from '~/components/hub/showcase/GameShowcaseCard';
import { Button } from '~/components/ui/button';
import { useScrollRail } from '~/hooks/useScrollRail';
import { countWord } from '~/util/games/visibility';
import { cn } from '~/lib/utils';

const navButtonClass =
  'size-7 shrink-0 rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

export function HubGameShowcase({ games = HUB_GAME_LIST }: { games?: HubGameMeta[] }) {
  const {
    ref: railRef,
    dragging,
    canPrev,
    canNext,
    active,
    scrollToIndex,
    scrollPage
  } = useScrollRail<HTMLDivElement>();

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:gap-4">
      <header className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div className="flex shrink-0" aria-hidden="true">
          {games.map((game, index) => (
            <GameAppIcon
              key={game.kind}
              game={game.kind}
              name={game.name}
              size="sm"
              className={cn(
                index > 0 && '-ml-2',
                // Phones: the first three marks only, so the title keeps its room.
                index > 2 && 'max-sm:hidden'
              )}
            />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
            <span className="krida-hero-wordmark">Krida</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Sanskrit Games — {countWord(games.length)} ways to play, learn, grow.
          </p>
        </div>
        <AllPuzzlesLink className="hidden shrink-0 sm:inline-flex" />
      </header>

      <div
        ref={railRef}
        aria-label="Games"
        className={cn(
          'scroll-rail relative -mx-1 flex gap-4 px-1 pt-1 pb-3 select-none',
          'snap-x snap-mandatory',
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {games.map((game, index) => (
          <div
            key={game.kind}
            aria-label={game.name}
            className="w-full shrink-0 snap-start sm:w-[calc((100%-1rem)/2)]"
          >
            <GameShowcaseCard game={game.kind} index={index} compact />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={navButtonClass}
          disabled={!canPrev}
          aria-label="Previous games"
          onClick={() => scrollPage(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <div className="flex items-center">
          {games.map((game, index) => (
            <button
              key={game.kind}
              type="button"
              aria-label={`Show ${game.name}`}
              aria-current={active === index ? 'true' : undefined}
              onClick={() => scrollToIndex(index)}
              className="flex size-5 items-center justify-center"
            >
              <span
                className={cn(
                  'rounded-full transition-[width,background-color] duration-200',
                  active === index
                    ? 'h-1.5 w-3 bg-slate-800 dark:bg-white'
                    : 'size-1.5 bg-slate-300 dark:bg-slate-600'
                )}
              />
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={navButtonClass}
          disabled={!canNext}
          aria-label="Next games"
          onClick={() => scrollPage(1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </section>
  );
}
