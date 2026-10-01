'use client';

import { useEffect, useState } from 'react';
import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Archive, Clock3, Play } from 'lucide-react';
import { getCDNUrl } from '~/constants';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { GameAppIcon } from '~/components/GameAppIcon';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import { cn } from '~/lib/utils';
import type { HubScheduledPuzzle } from './hub_data';
import { HUB_GAMES, puzzleHref, type HubGameMeta } from './hub_games';
import { HUB_GAME_THEME } from './hub_theme';
import { formatDurationHuman, isFreshDaily, remainingMs } from './hub_time';

const [IMAGE_W, IMAGE_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

export function TodayPuzzleTile({
  game,
  puzzle,
  nextStart
}: {
  game: HubGameMeta;
  puzzle: HubScheduledPuzzle | null;
  nextStart: Date | string | null;
}) {
  return puzzle ? (
    <ScheduledTile game={game} puzzle={puzzle} />
  ) : (
    <WaitingTile game={game} nextStart={nextStart} />
  );
}

function ScheduledTile({ game, puzzle }: { game: HubGameMeta; puzzle: HubScheduledPuzzle }) {
  const theme = HUB_GAME_THEME[game.kind];
  const href = puzzleHref(game.kind, puzzle.slug);
  const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn('overflow-hidden rounded-2xl ring-1', theme.ring, 'bg-card shadow-sm')}
    >
      <Link to={href} className="group relative block no-underline">
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: `${IMAGE_W} / ${IMAGE_H}` }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={IMAGE_W * 220}
              height={IMAGE_H * 220}
              className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className={cn('flex size-full items-center justify-center', theme.wash)}>
              <GameAppIcon game={game.icon} name={game.name} size="lg" />
            </div>
          )}
          <div className={cn('absolute inset-0 bg-linear-to-t', theme.overlay)} />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:p-6">
            <p className="text-[11px] font-medium tracking-[0.2em] text-white/80 uppercase">
              {game.name}
              <span className="mx-2 text-white/40">·</span>
              {game.subtitle}
            </p>
            <h3 className="font-serif text-2xl leading-tight font-semibold text-balance text-white sm:text-3xl">
              {puzzle.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <FreshnessBadge endTime={puzzle.end_time} />
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium shadow-md',
                  theme.play
                )}
              >
                <Play className="size-3.5" />
                Play
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function WaitingTile({ game, nextStart }: { game: HubGameMeta; nextStart: Date | string | null }) {
  const theme = HUB_GAME_THEME[game.kind];
  const archiveHref = HUB_GAMES[game.kind].puzzlesHref;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex min-h-64 flex-col justify-between rounded-2xl p-6 ring-1 sm:min-h-72',
        theme.wash,
        theme.ring
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn('text-[11px] font-medium tracking-[0.2em] uppercase', theme.muted)}>
            {game.subtitle}
          </p>
          <h3 className={cn('mt-1 font-serif text-2xl font-semibold', theme.ink)}>{game.name}</h3>
        </div>
        <GameAppIcon game={game.icon} name={game.name} size="sm" />
      </div>
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4 shrink-0" />
          {nextStart ? (
            <span>
              Next puzzle in <NextCountdown target={nextStart} />
            </span>
          ) : (
            <span>No puzzle scheduled right now</span>
          )}
        </p>
        <Button
          variant="outline"
          render={<Link to={archiveHref} />}
          nativeButton={false}
          className="w-fit"
        >
          <Archive data-icon="inline-start" />
          Play from the archive
        </Button>
      </div>
    </motion.article>
  );
}

function FreshnessBadge({ endTime }: { endTime: Date | string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const left = remainingMs(endTime, now);
  const fresh = isFreshDaily(endTime, now);

  return (
    <span className="flex flex-wrap items-center gap-2">
      {fresh ? <Badge className="bg-white/90 text-foreground hover:bg-white">New</Badge> : null}
      <span
        className="text-xs font-medium tracking-wide text-white/85 uppercase"
        suppressHydrationWarning
      >
        {left > 0 ? `${formatDurationHuman(left)} left` : 'Ending soon'}
      </span>
    </span>
  );
}

function NextCountdown({ target }: { target: Date | string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{formatDurationHuman(remainingMs(target, now))}</span>;
}
