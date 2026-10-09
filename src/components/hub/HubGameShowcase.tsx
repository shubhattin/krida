'use client';

import { useCallback, useEffect, useState } from 'react';
import { AllPuzzlesLink } from '~/components/PuzzleCatalogLink';
import { GameAppIcon } from '~/components/GameAppIcon';
import { GameShowcaseCard, GAMES } from '~/routes/-Landing';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '~/components/ui/carousel';
import { cn } from '~/lib/utils';

const navButtonClass =
  'static size-8 shrink-0 translate-x-0 translate-y-0 rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

export function HubGameShowcase() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [canScroll, setCanScroll] = useState(false);

  const onSelect = useCallback((instance: CarouselApi) => {
    if (!instance) return;
    setSelected(instance.selectedScrollSnap());
    setCanScroll(instance.canScrollPrev() || instance.canScrollNext());
  }, []);

  useEffect(() => {
    if (!api) return;
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    const frame = requestAnimationFrame(() => onSelect(api));
    return () => {
      cancelAnimationFrame(frame);
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect]);

  return (
    <section className="flex flex-col gap-4">
      <header className="mx-auto flex w-full max-w-3xl min-w-0 items-center gap-3">
        <div className="flex shrink-0" aria-hidden="true">
          <GameAppIcon game="padavali" name="Padāvalī" size="sm" className="relative z-10" />
          <GameAppIcon game="padajala" name="Padajāla" size="sm" className="-ml-2" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            <span className="krida-hero-wordmark">Krida</span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Sanskrit Games — a word search and crossword.
          </p>
        </div>
        <AllPuzzlesLink className="hidden shrink-0 sm:inline-flex" />
      </header>
      <div className="mx-auto w-full max-w-3xl sm:hidden">
        <AllPuzzlesLink />
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: 'start' }}
        className="mx-auto w-full max-w-3xl"
        aria-label="Games"
      >
        {canScroll ? (
          <div className="mb-3 flex items-center gap-2 md:hidden">
            <p className="mr-auto text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
              {selected + 1} / {GAMES.length}
            </p>
            <CarouselPrevious className={navButtonClass} />
            <CarouselNext className={navButtonClass} />
          </div>
        ) : null}

        <CarouselContent>
          {GAMES.map((game, index) => (
            <CarouselItem
              key={game.id}
              className="min-w-0 basis-full md:basis-1/2"
              aria-label={game.name}
            >
              <GameShowcaseCard game={game} index={index} compact />
            </CarouselItem>
          ))}
        </CarouselContent>

        {canScroll ? (
          <div className="mt-3 flex items-center justify-center gap-1.5 md:hidden">
            {GAMES.map((game, index) => (
              <button
                key={game.id}
                type="button"
                aria-label={`Show ${game.name}`}
                aria-current={selected === index ? 'true' : undefined}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  'size-2.5 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none',
                  selected === index
                    ? 'bg-slate-900 dark:bg-white'
                    : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500'
                )}
              />
            ))}
          </div>
        ) : null}
      </Carousel>
    </section>
  );
}
