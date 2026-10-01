'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { Clock } from 'lucide-react';
import { GameAppIcon } from '~/components/GameAppIcon';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import type { HubData, HubScheduledPuzzle } from './hub_data';
import { HUB_GAMES, puzzleHref } from './hub_games';
import { formatCountdown, useCountdown } from './useCountdown';
import type { HubGameMeta } from './hub_games';

function TodayCard({
  game,
  puzzle,
  nextStart
}: {
  game: HubGameMeta;
  puzzle: HubScheduledPuzzle | null;
  nextStart: Date | null;
}) {
  const target = puzzle?.end_time ?? nextStart;
  const remaining = useCountdown(target);
  const [w, h] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;
  const imageUrl = puzzle?.image ? getCDNUrl(puzzle.image.s3_key) : null;
  const href = puzzle ? puzzleHref(game.kind, puzzle.slug) : game.href;
  const countdownLabel =
    remaining == null
      ? null
      : puzzle
        ? `Ends in ${formatCountdown(remaining)}`
        : `Next in ${formatCountdown(remaining)}`;

  return (
    <Link
      to={href}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border bg-card p-2 no-underline shadow-xs transition-colors hover:bg-accent/40',
        game.kind === 'padavali'
          ? 'border-blue-200/70 dark:border-blue-800/50'
          : 'border-amber-200/70 dark:border-amber-800/50'
      )}
    >
      <div
        className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-16"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={w * 48}
            height={h * 48}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <GameAppIcon
              game={game.icon}
              name={game.name}
              size="sm"
              className="size-10 rounded-lg"
            />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Today · {game.name}
        </p>
        <p className="truncate text-sm font-semibold">{puzzle?.title ?? 'No puzzle scheduled'}</p>
        {countdownLabel ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            <span className="tabular-nums">{countdownLabel}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">Check back later</p>
        )}
      </div>
    </Link>
  );
}

export function HubTodayStrip({ data }: { data: HubData }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Today</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <TodayCard
          game={HUB_GAMES.padavali}
          puzzle={data.padavali.today}
          nextStart={data.padavali.next_start}
        />
        <TodayCard
          game={HUB_GAMES.crossword}
          puzzle={data.crossword.today}
          nextStart={data.crossword.next_start}
        />
      </div>
    </section>
  );
}
