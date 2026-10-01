'use client';

import { useContext, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { AppContext } from '~/components/AppDataContext';
import { cn } from '~/lib/utils';
import { FONT_INFO } from '~/state/script_font_data';
import { HUB_GAMES } from './hub_games';
import { GAME_ACCENT, HUB_FULL_BLEED } from './hub_layout';
import { HubCoverImage, HubGameBadge } from './HubPosterCard';
import type { HubPuzzle } from './hub_puzzles';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';

export type HeroSlide =
  | {
      kind: 'puzzle';
      key: string;
      puzzle: HubPuzzle;
      moreSearch: { game: 'padavali' | 'crossword' };
    }
  | {
      kind: 'collection';
      key: string;
      collection: ListedCollectionsType[number];
    };

const ROTATE_MS = 8000;

export function HubHero({ slides }: { slides: HeroSlide[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { script } = useContext(AppContext);

  const count = slides.length;
  const slide = count > 0 ? slides[index % count]! : null;

  useEffect(() => {
    if (reduceMotion || paused || count < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused, count]);

  if (!slide) {
    return <HeroFallback />;
  }

  const title = slide.kind === 'puzzle' ? slide.puzzle.title : slide.collection.title;
  const description =
    slide.kind === 'puzzle' ? slide.puzzle.description : slide.collection.description;
  const image = slide.kind === 'puzzle' ? slide.puzzle.image : slide.collection.image;
  const fontClass =
    slide.kind === 'puzzle' && slide.puzzle.game === 'padavali'
      ? FONT_INFO[script]?.className
      : undefined;

  return (
    <section
      className={cn(HUB_FULL_BLEED, '-mt-16')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[88svh] w-full overflow-hidden sm:min-h-[78svh]">
        <div className="absolute inset-0 min-h-[88svh] sm:min-h-[78svh]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.key}
              className="absolute inset-0"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7 }}
            >
              <HubCoverImage image={image} alt="" />
              <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/55 to-black/20" />
              <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-black/40" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-end px-4 pt-24 pb-12 sm:min-h-[78svh] sm:px-8 sm:pb-16 lg:px-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.key}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.45 }}
              className="flex max-w-xl flex-col gap-4 text-white"
            >
              {slide.kind === 'puzzle' ? (
                <HubGameBadge game={slide.puzzle.game} />
              ) : (
                <span className="inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
                  Collection
                </span>
              )}
              <h1
                className={cn(
                  'font-serif text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl',
                  fontClass
                )}
              >
                {title}
              </h1>
              {description ? (
                <p className={cn('line-clamp-3 text-sm text-white/80 sm:text-base', fontClass)}>
                  {description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {slide.kind === 'puzzle' ? (
                  <>
                    <Button
                      size="lg"
                      className="gap-2 bg-white text-zinc-950 hover:bg-white/90"
                      render={<Link to={slide.puzzle.href} />}
                      nativeButton={false}
                    >
                      <Play className="fill-current" />
                      Play now
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="border-white/20 bg-white/15 text-white hover:bg-white/25"
                      render={<Link to="/explore" search={slide.moreSearch} />}
                      nativeButton={false}
                    >
                      More like this
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="gap-2 bg-white text-zinc-950 hover:bg-white/90"
                      render={
                        <Link to="/collections/$slug" params={{ slug: slide.collection.slug }} />
                      }
                      nativeButton={false}
                    >
                      <Play className="fill-current" />
                      Play now
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="border-white/20 bg-white/15 text-white hover:bg-white/25"
                      render={<Link to="/explore" search={{ view: 'collections' }} />}
                      nativeButton={false}
                    >
                      More like this
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {count > 1 ? (
            <div className="mt-8 flex items-center gap-3">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Previous spotlight"
                className="text-white hover:bg-white/15"
                onClick={() => setIndex((current) => (current - 1 + count) % count)}
              >
                <ChevronLeft />
              </Button>
              <div className="flex items-center gap-1.5">
                {slides.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={`Show spotlight ${i + 1}`}
                    aria-current={i === index % count}
                    onClick={() => setIndex(i)}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === index % count ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    )}
                  />
                ))}
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Next spotlight"
                className="text-white hover:bg-white/15"
                onClick={() => setIndex((current) => (current + 1) % count)}
              >
                <ChevronRight />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroFallback() {
  return (
    <section className={cn(HUB_FULL_BLEED, '-mt-16')}>
      <div className="relative min-h-[72svh] overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.28),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.22),transparent_50%)]" />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/40 to-black/50" />
        <div className="relative z-10 mx-auto flex min-h-[72svh] max-w-6xl flex-col justify-end px-4 pt-24 pb-16 sm:px-8 lg:px-12">
          <div className="flex max-w-xl flex-col gap-4 text-white">
            <span className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
              Sanskrit Games
            </span>
            <h1 className="font-serif text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
              Learn Sanskrit through play
            </h1>
            <p className="text-sm text-white/80 sm:text-base">
              Word-search and crossword puzzles with illustrated covers, shared collections, and
              Indian scripts — all in one place.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                size="lg"
                className="bg-white text-zinc-950 hover:bg-white/90"
                render={<Link to="/explore" />}
                nativeButton={false}
              >
                Browse puzzles
              </Button>
              {HUB_GAME_LIST_CTA.map((game) => (
                <Button
                  key={game.kind}
                  size="lg"
                  variant="secondary"
                  className={cn(
                    'border-white/15 bg-white/10 text-white hover:bg-white/20',
                    `hover:shadow-lg`
                  )}
                  render={<Link to={game.href} />}
                  nativeButton={false}
                >
                  <span
                    className={cn('size-2 rounded-full bg-linear-to-br', GAME_ACCENT[game.kind])}
                  />
                  {game.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const HUB_GAME_LIST_CTA = [HUB_GAMES.padavali, HUB_GAMES.crossword];
