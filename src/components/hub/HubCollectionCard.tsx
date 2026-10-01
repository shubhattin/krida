'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { getCDNUrl } from '~/constants';
import { Badge } from '~/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import { HUB_GAMES } from './hub_games';
import { collectionGames } from './hub_puzzles';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';

const [IMAGE_W, IMAGE_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

export function HubCollectionCard({ collection }: { collection: ListedCollectionsType[number] }) {
  const games = collectionGames(collection);
  const imageUrl = collection.image ? getCDNUrl(collection.image.s3_key) : null;
  const count = collection.items.length;

  return (
    <Link
      to="/collections/$slug"
      params={{ slug: collection.slug }}
      className="group block h-full no-underline"
    >
      <Card className="h-full py-0 transition-shadow hover:shadow-md">
        <div
          className="relative w-full overflow-hidden bg-muted"
          style={{ aspectRatio: `${IMAGE_W} / ${IMAGE_H}` }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={IMAGE_W * 128}
              height={IMAGE_H * 128}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
        </div>
        <CardHeader className="gap-1.5 pb-4">
          <CardTitle className="line-clamp-2">{collection.title}</CardTitle>
          <CardDescription>
            {count} puzzle{count === 1 ? '' : 's'}
          </CardDescription>
          {games.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {games.map((game) => (
                <Badge key={game} variant="secondary">
                  {HUB_GAMES[game].name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
      </Card>
    </Link>
  );
}
