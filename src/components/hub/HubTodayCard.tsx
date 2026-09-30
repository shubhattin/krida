'use client';

import { useEffect, useState } from 'react';
import prettyMs from 'pretty-ms';
import { Link } from '@tanstack/react-router';
import { Clock3, Play } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { GameAppIcon } from '~/components/GameAppIcon';
import type { HubScheduledPuzzle } from './hub_data';
import { HUB_GAMES, puzzleHref, type HubGameMeta } from './hub_games';
import { HubThumb } from './HubThumb';

function useRemainingMs(target: Date | string | null | undefined) {
  const ms = target ? new Date(target).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (ms == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ms]);

  if (ms == null) return null;
  return Math.max(0, ms - now);
}

function formatRemaining(ms: number) {
  if (ms <= 0) return 'Ended';
  return prettyMs(ms, { secondsDecimalDigits: 0 });
}

export function HubTodayCard({
  game,
  puzzle,
  nextStart
}: {
  game: HubGameMeta;
  puzzle: HubScheduledPuzzle | null;
  nextStart: Date | string | null;
}) {
  const remaining = useRemainingMs(puzzle ? puzzle.end_time : nextStart);
  const href = puzzle ? puzzleHref(game.kind, puzzle.slug) : game.href;
  const countdownLabel = puzzle
    ? remaining != null
      ? `Ends in ${formatRemaining(remaining)}`
      : null
    : remaining != null && remaining > 0
      ? `Next in ${formatRemaining(remaining)}`
      : 'No puzzle scheduled right now';

  return (
    <Card className="bg-card/80 py-0 ring-foreground/8">
      <CardContent className="flex gap-3 p-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {puzzle?.image ? (
            <HubThumb image={puzzle.image} alt="" className="size-full" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <GameAppIcon game={game.icon} name={game.name} size="sm" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{game.name}</Badge>
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {game.subtitle}
            </span>
          </div>
          <p className="truncate text-sm font-semibold">{puzzle?.title ?? 'No puzzle scheduled'}</p>
          <p
            className="flex items-center gap-1 text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            <Clock3 className="size-3.5" />
            {countdownLabel}
          </p>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to={href} className="self-start no-underline" />}
          >
            <Play data-icon="inline-start" />
            {puzzle ? 'Play today' : 'Open game'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HubTodayPair({
  padavaliToday,
  padavaliNext,
  crosswordToday,
  crosswordNext
}: {
  padavaliToday: HubScheduledPuzzle | null;
  padavaliNext: Date | string | null;
  crosswordToday: HubScheduledPuzzle | null;
  crosswordNext: Date | string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <HubTodayCard game={HUB_GAMES.padavali} puzzle={padavaliToday} nextStart={padavaliNext} />
      <HubTodayCard game={HUB_GAMES.crossword} puzzle={crosswordToday} nextStart={crosswordNext} />
    </div>
  );
}
