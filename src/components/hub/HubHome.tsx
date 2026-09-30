'use client';

import { useContext } from 'react';
import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { AppContext } from '~/components/AppDataContext';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { getCDNUrl } from '~/constants';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { HUB_GAMES, HUB_GAME_LIST } from './hub_games';
import type { HubData, HubScheduledPuzzle } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { HubCollectionCard } from './HubCollectionCard';
import { HubCountdown } from './HubCountdown';
import { tagsByPopularity, type HubPuzzle } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import type { HubGameMeta } from './hub_games';

const [IMAGE_W, IMAGE_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

function greetingLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function interleavePuzzles(puzzles: HubPuzzle[], limit: number) {
  const padavali = puzzles.filter((puzzle) => puzzle.game === 'padavali');
  const crossword = puzzles.filter((puzzle) => puzzle.game === 'crossword');
  const mixed: HubPuzzle[] = [];
  const max = Math.max(padavali.length, crossword.length);
  for (let i = 0; i < max && mixed.length < limit; i++) {
    const left = padavali[i];
    const right = crossword[i];
    if (left) mixed.push(left);
    if (mixed.length >= limit) break;
    if (right) mixed.push(right);
  }
  return mixed;
}

export default function HubHome({ data }: { data: HubData }) {
  const { script, setScript } = useContext(AppContext);
  const { puzzles } = useHubPuzzles(data);
  const tags = tagsByPopularity(puzzles).slice(0, 16);
  const featured = interleavePuzzles(puzzles, 8);
  const today = [
    { game: HUB_GAMES.padavali, puzzle: data.padavali.today, nextStart: data.padavali.next_start },
    {
      game: HUB_GAMES.crossword,
      puzzle: data.crossword.today,
      nextStart: data.crossword.next_start
    }
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {greetingLabel()}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Today&apos;s Sanskrit puzzles, collections, and topics — all in one place.
          </p>
        </div>
        <ScriptSelector script={script} onScriptChange={setScript} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {today.map(({ game, puzzle, nextStart }) => (
            <TodayCard key={game.kind} game={game} puzzle={puzzle} nextStart={nextStart} />
          ))}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Jump back in</h2>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/explore" />}>
              See all
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((puzzle) => (
              <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
            ))}
          </div>
        </section>
      ) : null}

      {data.collections.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Collections</h2>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link to="/explore" search={{ view: 'collections' }} />}
            >
              See all
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.collections.slice(0, 6).map((collection) => (
              <HubCollectionCard key={collection.uid} collection={collection} />
            ))}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button
                key={tag.id}
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="/explore" search={{ tag: tag.slug }} />}
              >
                {tag.name}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Games</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {HUB_GAME_LIST.map((game) => (
            <Link
              key={game.kind}
              to={game.href}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 no-underline transition-colors hover:bg-muted/60"
            >
              <Image
                src={GAME_APP_ICON_SRC[game.icon]}
                alt=""
                width={40}
                height={40}
                className="size-10"
              />
              <div className="min-w-0">
                <p className="font-medium">{game.name}</p>
                <p className="truncate text-sm text-muted-foreground">{game.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function TodayCard({
  game,
  puzzle,
  nextStart
}: {
  game: HubGameMeta;
  puzzle: HubScheduledPuzzle | null;
  nextStart: Date | string | null;
}) {
  const playTo = puzzle
    ? game.kind === 'padavali'
      ? '/padavali/$slug'
      : '/padajala/$slug'
    : game.puzzlesHref;
  const playParams = puzzle ? { slug: puzzle.slug } : undefined;
  const imageUrl = puzzle?.image ? getCDNUrl(puzzle.image.s3_key) : null;

  return (
    <Card className="overflow-hidden py-0">
      <div
        className="relative w-full overflow-hidden bg-muted"
        style={{ aspectRatio: `${IMAGE_W} / ${IMAGE_H}` }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={IMAGE_W * 160}
            height={IMAGE_H * 160}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Image
              src={GAME_APP_ICON_SRC[game.icon]}
              alt=""
              width={56}
              height={56}
              className="size-14 opacity-80"
            />
          </div>
        )}
      </div>
      <CardHeader className="gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {game.name}
        </p>
        <CardTitle className="line-clamp-2">
          {puzzle?.title ?? 'No puzzle scheduled right now'}
        </CardTitle>
        {puzzle ? (
          <CardDescription>
            <HubCountdown end={puzzle.end_time} />
          </CardDescription>
        ) : nextStart ? (
          <CardDescription suppressHydrationWarning>
            Next {new Date(nextStart).toLocaleString()}
          </CardDescription>
        ) : (
          <CardDescription>{game.description}</CardDescription>
        )}
      </CardHeader>
      <CardFooter>
        <Button
          nativeButton={false}
          render={puzzle ? <Link to={playTo} params={playParams} /> : <Link to={playTo} />}
        >
          <Play data-icon="inline-start" />
          {puzzle ? 'Play' : 'Browse puzzles'}
        </Button>
      </CardFooter>
    </Card>
  );
}
