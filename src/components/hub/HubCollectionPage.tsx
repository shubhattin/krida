'use client';

import { useSyncExternalStore } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Play } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Image } from '@unpic/react';
import type { HubData } from './hub_data';
import { collectionGames, resolveCollectionItems, type HubPuzzle } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { HUB_GAMES } from './hub_games';
import { HubThumb } from './HubThumb';
import { HubPageFrame } from './HubHeader';
import { readPathProgress, writePathProgress } from './path_progress';

function usePathProgress(slug: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const onEvent = () => onStoreChange();
      window.addEventListener('storage', onEvent);
      window.addEventListener('path-progress', onEvent);
      return () => {
        window.removeEventListener('storage', onEvent);
        window.removeEventListener('path-progress', onEvent);
      };
    },
    () => readPathProgress(slug),
    () => null
  );
}

export default function HubCollectionPage({ data, slug }: { data: HubData; slug: string }) {
  const { byKey } = useHubPuzzles(data);
  const collection = data.collections.find((row) => row.slug === slug);
  const lastKey = usePathProgress(slug);

  if (!collection) {
    return <p className="py-16 text-center text-muted-foreground">Path not found.</p>;
  }

  const items = resolveCollectionItems(collection.items, byKey);
  const games = collectionGames(collection);
  const continueItem = items.find((item) => item.key === lastKey) ?? items[0];
  const ctaLabel = lastKey && items.some((item) => item.key === lastKey) ? 'Continue' : 'Start';
  const stepLabel = items.length === 1 ? '1 step' : `${items.length} steps`;

  return (
    <HubPageFrame className="gap-8 pb-28">
      <Link
        to="/explore"
        search={{ view: 'collections' }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All paths
      </Link>

      <header className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:items-start">
        <div className="aspect-[3/2] overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
          <HubThumb image={collection.image} alt="" />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{collection.title}</h1>
          {collection.description ? (
            <p className="max-w-2xl text-muted-foreground">{collection.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{stepLabel}</Badge>
            {games.map((kind) => (
              <Badge key={kind} variant="outline" className="gap-1">
                <Image
                  src={GAME_APP_ICON_SRC[HUB_GAMES[kind].icon]}
                  alt=""
                  width={14}
                  height={14}
                  className="size-3.5"
                />
                {HUB_GAMES[kind].name}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No listed puzzles in this path yet.
        </p>
      ) : (
        <ol className="flex flex-col">
          {items.map((puzzle, index) => (
            <PathTimelineStep
              key={puzzle.key}
              puzzle={puzzle}
              index={index}
              total={items.length}
              slug={slug}
              isContinue={continueItem?.key === puzzle.key && ctaLabel === 'Continue'}
            />
          ))}
        </ol>
      )}

      {continueItem ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4">
          <div className="pointer-events-auto mx-auto flex max-w-lg items-center justify-between gap-3 rounded-xl border bg-card/95 p-3 shadow-lg ring-1 ring-foreground/10 backdrop-blur">
            <div className="min-w-0">
              <p className="text-sm font-medium">{ctaLabel} this path</p>
              <p className="truncate text-xs text-muted-foreground">{continueItem.title}</p>
            </div>
            <Button
              nativeButton={false}
              render={<Link to={continueItem.href} />}
              onClick={() => writePathProgress(slug, continueItem.key)}
            >
              <Play data-icon="inline-start" />
              {ctaLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </HubPageFrame>
  );
}

function PathTimelineStep({
  puzzle,
  index,
  total,
  slug,
  isContinue
}: {
  puzzle: HubPuzzle;
  index: number;
  total: number;
  slug: string;
  isContinue: boolean;
}) {
  const game = HUB_GAMES[puzzle.game];
  const isLast = index === total - 1;

  return (
    <li className="flex gap-4">
      <div className="flex w-9 shrink-0 flex-col items-center">
        <span className="flex size-9 items-center justify-center rounded-full border bg-background text-sm font-semibold">
          {index + 1}
        </span>
        {isLast ? null : <span className="w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="flex min-w-0 flex-1 gap-4 pb-8">
        <div className="hidden size-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
          {puzzle.image ? (
            <HubThumb image={puzzle.image} alt="" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Image
                src={GAME_APP_ICON_SRC[game.icon]}
                alt=""
                width={32}
                height={32}
                className="size-8"
              />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{puzzle.title}</h2>
            {isContinue ? <Badge variant="secondary">Continue</Badge> : null}
          </div>
          {puzzle.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{puzzle.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Image
                src={GAME_APP_ICON_SRC[game.icon]}
                alt=""
                width={14}
                height={14}
                className="size-3.5"
              />
              {game.name}
            </Badge>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link to={puzzle.href} />}
              onClick={() => writePathProgress(slug, puzzle.key)}
            >
              <Play data-icon="inline-start" />
              Play
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
