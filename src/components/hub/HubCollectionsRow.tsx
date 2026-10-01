'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { Button } from '~/components/ui/button';
import { getCDNUrl } from '~/constants';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import { collectionGames } from './hub_puzzles';
import { HubGameBadge } from './HubGameBadge';

export function HubCollectionsRow({ collections }: { collections: ListedCollectionsType }) {
  if (collections.length === 0) return null;

  const [w, h] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

  return (
    <Collapsible defaultOpen className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Collections
        </h2>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="group gap-1 text-muted-foreground"
            />
          }
        >
          {collections.length}
          <ChevronDown className="size-3.5 transition-transform group-aria-expanded:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {collections.map((collection) => {
            const imageUrl = collection.image ? getCDNUrl(collection.image.s3_key) : null;
            const games = collectionGames(collection);
            return (
              <Link
                key={collection.uid}
                to="/collections/$slug"
                params={{ slug: collection.slug }}
                className="w-44 shrink-0 overflow-hidden rounded-xl border bg-card no-underline shadow-xs transition-colors hover:bg-accent/40 sm:w-52"
              >
                <div className="bg-muted" style={{ aspectRatio: `${w} / ${h}` }}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      width={w * 96}
                      height={h * 96}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
                      Collection
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-2.5">
                  <p className="line-clamp-2 text-sm leading-snug font-semibold">
                    {collection.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {collection.items.length} puzzle{collection.items.length === 1 ? '' : 's'}
                  </p>
                  {games.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {games.map((game) => (
                        <HubGameBadge key={game} game={game} className="h-4 px-1.5 text-[10px]" />
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
