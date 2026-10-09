'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, CalendarClock, Play } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import { GameAppIcon } from '~/components/GameAppIcon';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import type { HubScheduledPuzzle } from './hub_data';
import { HUB_GAME_ACCENT, type HubGameMeta } from './hub_games';
import { HubCountdown } from './HubCountdown';
import { HubGameBadge } from './HubGameBadge';

const [IMG_W, IMG_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

export function HubTodayCard({
  game,
  puzzle,
  nextStart
}: {
  game: HubGameMeta;
  puzzle: HubScheduledPuzzle | null;
  nextStart: Date | null;
}) {
  const accent = HUB_GAME_ACCENT[game.kind];
  const imageUrl = puzzle?.image ? getCDNUrl(puzzle.image.s3_key) : null;

  if (!puzzle) {
    return (
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:bg-slate-900/50',
          accent.border
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute -top-16 -right-10 size-40 rounded-full blur-3xl',
            accent.glow
          )}
        />
        <div className="relative flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <GameAppIcon game={game.icon} name={game.name} size="md" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">{game.name}</p>
              <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {game.subtitle}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No puzzle scheduled right now.
          </p>
          {nextStart ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CalendarClock className="size-3.5" />
              <HubCountdown target={nextStart} prefix="Next starts in" />
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Check back later for the next round.
            </p>
          )}
          <div className="mt-auto">
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link
                  to="/puzzles"
                  search={{ game: game.puzzlesGame }}
                  className="inline-flex items-center gap-1.5"
                />
              }
            >
              Browse puzzles
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const playLink =
    game.kind === 'padavali' ? (
      <Link
        to="/padavali/$slug"
        params={{ slug: puzzle.slug }}
        className="inline-flex items-center justify-center gap-1.5"
      />
    ) : (
      <Link
        to="/padajala/$slug"
        params={{ slug: puzzle.slug }}
        className="inline-flex items-center justify-center gap-1.5"
      />
    );

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/80 shadow-md backdrop-blur-sm dark:bg-slate-900/60',
        accent.border
      )}
    >
      <div
        className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
        style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={IMG_W * 160}
            height={IMG_H * 160}
            className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={cn(
              'flex size-full items-center justify-center bg-linear-to-br',
              accent.gradient
            )}
          >
            <GameAppIcon game={game.icon} name={game.name} size="lg" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <HubGameBadge game={game.kind} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase backdrop-blur-sm">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="line-clamp-2 text-lg font-bold text-slate-900 dark:text-slate-50">
            {puzzle.title}
          </h3>
          {puzzle.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
              {puzzle.description}
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full border border-rose-200/70 bg-rose-50/80 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300">
            <HubCountdown target={puzzle.end_time} prefix="Ends in" />
          </span>
          <Button
            nativeButton={false}
            className={cn('px-4 font-bold shadow-md', accent.cta)}
            render={playLink}
          >
            <Play className="size-3.5 fill-current" />
            Play
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
