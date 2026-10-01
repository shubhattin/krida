'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Play } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Image } from '@unpic/react';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import { collectionGames, type HubPuzzle } from './hub_puzzles';
import { HUB_GAMES } from './hub_games';
import { HubThumb } from './HubThumb';

export const PATH_VISIBLE_STEPS = 6;

export function HubPathSteps({ items }: { items: HubPuzzle[] }) {
  const visible = items.slice(0, PATH_VISIBLE_STEPS);
  const overflow = items.length - visible.length;

  return (
    <ol className="flex min-w-0 items-center">
      {visible.map((puzzle, index) => (
        <li key={puzzle.key} className="flex min-w-0 items-center">
          {index > 0 ? <span className="h-px w-3 shrink-0 bg-border sm:w-4" aria-hidden /> : null}
          <div className="relative shrink-0">
            <div className="size-9 overflow-hidden rounded-full ring-2 ring-background">
              {puzzle.image ? (
                <HubThumb image={puzzle.image} alt="" />
              ) : (
                <div className="flex size-full items-center justify-center bg-muted">
                  <Image
                    src={GAME_APP_ICON_SRC[HUB_GAMES[puzzle.game].icon]}
                    alt=""
                    width={20}
                    height={20}
                    className="size-4"
                  />
                </div>
              )}
            </div>
            <span className="absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {index + 1}
            </span>
          </div>
        </li>
      ))}
      {overflow > 0 ? (
        <li className="flex items-center">
          <span className="h-px w-3 shrink-0 bg-border sm:w-4" aria-hidden />
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
            +{overflow}
          </span>
        </li>
      ) : null}
    </ol>
  );
}

export function HubPathCard({
  collection,
  items
}: {
  collection: ListedCollectionsType[number];
  items: HubPuzzle[];
}) {
  const games = collectionGames(collection);
  const startHref = items[0]?.href;
  const stepLabel = items.length === 1 ? '1 step' : `${items.length} steps`;

  return (
    <Card className="h-full py-0">
      <div className="aspect-[3/2] overflow-hidden bg-muted">
        <HubThumb image={collection.image} alt="" />
      </div>
      <CardHeader className="gap-2">
        <CardTitle className="text-base">{collection.title}</CardTitle>
        {collection.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{stepLabel}</Badge>
          {games.map((kind) => (
            <span
              key={kind}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Image
                src={GAME_APP_ICON_SRC[HUB_GAMES[kind].icon]}
                alt=""
                width={16}
                height={16}
                className="size-4"
              />
              {HUB_GAMES[kind].name}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <HubPathSteps items={items} />
        ) : (
          <p className="text-sm text-muted-foreground">No listed puzzles in this path yet.</p>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-2">
        {startHref ? (
          <Button size="sm" nativeButton={false} render={<Link to={startHref} />}>
            <Play data-icon="inline-start" />
            Start path
          </Button>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link to="/collections/$slug" params={{ slug: collection.slug }} />}
        >
          View path
          <ArrowRight data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
