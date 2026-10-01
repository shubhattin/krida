'use client';

import { Link } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import { ArrowLeft } from 'lucide-react';
import { getCDNUrl } from '~/constants';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import type { HubData } from './hub_data';
import { collectionGames, resolveCollectionItems } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import HubLibrary from './HubLibrary';
import { HubGameBadge } from './HubGameBadge';

/** Collection page: library filters scoped to this collection's ordered puzzles. */
export default function HubCollectionPage({ data, slug }: { data: HubData; slug: string }) {
  const { byKey } = useHubPuzzles(data);
  const collection = data.collections.find((row) => row.slug === slug);

  if (!collection) {
    return <p className="py-16 text-center text-muted-foreground">Collection not found.</p>;
  }

  const items = resolveCollectionItems(collection.items, byKey);
  const games = collectionGames(collection);
  const [w, h] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;
  const imageUrl = collection.image ? getCDNUrl(collection.image.s3_key) : null;

  return (
    <HubLibrary
      data={data}
      puzzles={items}
      showToday={false}
      showCollections={false}
      preserveOrder
      heading={
        <div className="flex flex-col gap-4">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Library
          </Link>
          <div className="flex gap-4">
            {imageUrl ? (
              <div
                className="hidden w-36 shrink-0 overflow-hidden rounded-xl border bg-muted sm:block"
                style={{ aspectRatio: `${w} / ${h}` }}
              >
                <Image
                  src={imageUrl}
                  alt=""
                  width={w * 96}
                  height={h * 96}
                  className="size-full object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {collection.title}
              </h1>
              {collection.description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {collection.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {games.map((game) => (
                  <HubGameBadge key={game} game={game} />
                ))}
                <span className="text-xs text-muted-foreground">
                  {items.length} puzzle{items.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        </div>
      }
      subheading="Filter this collection, or search to jump to a puzzle."
    />
  );
}
