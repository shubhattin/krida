'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { getCDNUrl } from '~/constants';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import type { HubData } from './hub_data';
import { HUB_GAMES } from './hub_games';
import { collectionGames, resolveCollectionItems } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';

const [IMAGE_W, IMAGE_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

export default function HubCollectionPage({ data, slug }: { data: HubData; slug: string }) {
  const { byKey } = useHubPuzzles(data);
  const collection = data.collections.find((row) => row.slug === slug);

  if (!collection) {
    return <p className="py-16 text-center text-muted-foreground">Collection not found.</p>;
  }

  const items = resolveCollectionItems(collection.items, byKey);
  const games = collectionGames(collection);
  const imageUrl = collection.image ? getCDNUrl(collection.image.s3_key) : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        nativeButton={false}
        render={<Link to="/explore" search={{ view: 'collections' }} />}
      >
        All collections
      </Button>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div
          className="w-full overflow-hidden rounded-xl bg-muted sm:w-56"
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
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Collection
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{collection.title}</h1>
          {collection.description ? (
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm text-muted-foreground">
              {items.length} puzzle{items.length === 1 ? '' : 's'}
            </span>
            {games.map((game) => (
              <Badge key={game} variant="secondary">
                {HUB_GAMES[game].name}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <ol className="flex flex-col gap-1">
        {items.map((puzzle, index) => {
          const thumb = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;
          return (
            <li key={puzzle.key}>
              <Link
                to={puzzle.game === 'padavali' ? '/padavali/$slug' : '/padajala/$slug'}
                params={{ slug: puzzle.slug }}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 no-underline transition-colors hover:bg-muted/70"
              >
                <span className="w-6 shrink-0 text-center text-sm text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      width={48}
                      height={48}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Image
                      src={GAME_APP_ICON_SRC[HUB_GAMES[puzzle.game].icon]}
                      alt=""
                      width={28}
                      height={28}
                      className="size-full object-contain p-2"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{puzzle.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {HUB_GAMES[puzzle.game].name}
                  </p>
                </div>
                <Image
                  src={GAME_APP_ICON_SRC[HUB_GAMES[puzzle.game].icon]}
                  alt=""
                  width={20}
                  height={20}
                  className="hidden size-5 sm:block"
                />
                <Button size="sm" tabIndex={-1} className="shrink-0">
                  <Play data-icon="inline-start" />
                  Play
                </Button>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
