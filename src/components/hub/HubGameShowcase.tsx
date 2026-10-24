'use client';

import { useContext } from 'react';
import { Image } from '@unpic/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { AppContext } from '~/components/AppDataContext';
import { AllPuzzlesLink } from '~/components/PuzzleCatalogLink';
import { HUB_GAME_LIST, type HubGameMeta } from '~/components/hub/hub_games';
import { GameShowcaseCard } from '~/components/hub/showcase/GameShowcaseCard';
import { KRIDA_NAME, useScriptName } from '~/components/hub/useScriptName';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { Button } from '~/components/ui/button';
import { useScrollRail } from '~/hooks/useScrollRail';
import { cn } from '~/lib/utils';

const navButtonClass =
  'size-7 shrink-0 rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

export function HubGameShowcase({ games = HUB_GAME_LIST }: { games?: HubGameMeta[] }) {
  const { ref: railRef, dragging, canPrev, canNext, scrollPage } = useScrollRail<HTMLDivElement>();
  const { script, setScript } = useContext(AppContext);
  const krida = useScriptName(KRIDA_NAME);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:gap-4">
      <header className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Image
            src="/img/icon_128.png"
            alt=""
            width={48}
            height={48}
            className="size-10 shrink-0 rounded-xl shadow-md sm:size-12"
          />
          <h1
            className="min-w-0 flex-1 truncate py-1 text-2xl leading-tight font-black tracking-tight sm:text-4xl"
            title={KRIDA_NAME.iast}
          >
            <span className={cn('krida-hero-wordmark', krida.fontClassName)}>{krida.text}</span>
          </h1>
          {/* Script switching is a headline feature, so it sits beside the brand on every screen. */}
          <ScriptSelector script={script} onScriptChange={setScript} prominent />
          <AllPuzzlesLink className="hidden shrink-0 sm:inline-flex" />
          {/* Arrows live in the header (no row of their own); touch screens swipe instead. */}
          <div className="flex shrink-0 items-center gap-1.5 pointer-coarse:hidden">
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
        </div>
        <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
          Fun Sanskrit Puzzles to Play &amp; Learn — in all Indic Scripts
        </p>
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
            // Phones: a slice of the next card peeks in to show the row swipes.
            className="w-[86%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)]"
          >
            <GameShowcaseCard game={game.kind} index={index} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
