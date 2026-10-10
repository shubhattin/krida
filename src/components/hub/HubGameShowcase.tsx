'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { AllPuzzlesLink } from '~/components/PuzzleCatalogLink';
import { GameAppIcon } from '~/components/GameAppIcon';
import { GameShowcaseCard, GAMES } from '~/routes/-Landing';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi
} from '~/components/ui/carousel';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

const navButtonClass =
  'size-7 shrink-0 rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';

export function HubGameShowcase() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback((instance: CarouselApi) => {
    if (!instance) return;
    setSelected(instance.selectedScrollSnap());
    setCanPrev(instance.canScrollPrev());
    setCanNext(instance.canScrollNext());
  }, []);

  useEffect(() => {
    if (!api) return;
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    const frame = requestAnimationFrame(() => {
      api.reInit();
      onSelect(api);
    });
    return () => {
      cancelAnimationFrame(frame);
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect]);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:gap-4">
      <header className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div className="flex shrink-0" aria-hidden="true">
          <GameAppIcon game="padavali" name="Padāvalī" size="sm" className="relative z-10" />
          <GameAppIcon game="padajala" name="Padajāla" size="sm" className="-ml-2" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
            <span className="krida-hero-wordmark">Krida</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Sanskrit Games — a word search and crossword.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:hidden">
          <div className="mr-0.5 flex items-center">
            {GAMES.map((game, index) => (
              <button
                key={game.id}
                type="button"
                aria-label={`Show ${game.name}`}
                aria-current={selected === index ? 'true' : undefined}
                onClick={() => api?.scrollTo(index)}
                className="flex size-5 items-center justify-center"
              >
                <span
                  className={cn(
                    'rounded-full transition-[width,background-color] duration-200',
                    selected === index
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
            disabled={!canPrev}
            aria-label="Previous game"
            onClick={() => api?.scrollPrev()}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className={navButtonClass}
            disabled={!canNext}
            aria-label="Next game"
            onClick={() => api?.scrollNext()}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <AllPuzzlesLink className="hidden shrink-0 sm:inline-flex" />
      </header>

      <Carousel setApi={setApi} opts={{ align: 'start' }} aria-label="Games">
        <CarouselContent>
          {GAMES.map((game, index) => (
            <CarouselItem
              key={game.id}
              className="min-w-0 basis-full sm:basis-1/2"
              aria-label={game.name}
            >
              <GameShowcaseCard game={game} index={index} compact cardLink="puzzles" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
