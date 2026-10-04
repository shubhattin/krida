'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Layers } from 'lucide-react';
import { getCDNUrl } from '~/constants';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { collectionGames, resolveCollectionItems } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { HubGameBadge } from './HubGameBadge';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';

const [IMG_W, IMG_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

/** Public collection page: ordered puzzles from every game in the collection. */
export default function HubCollectionPage({ data, slug }: { data: HubData; slug: string }) {
  const { byKey } = useHubPuzzles(data);
  const collection = data.collections.find((row) => row.slug === slug);

  if (!collection) {
    return <p className="py-16 text-center text-slate-500">Collection not found.</p>;
  }

  const items = resolveCollectionItems(collection.items, byKey);
  const games = collectionGames(collection);
  const imageUrl = collection.image ? getCDNUrl(collection.image.s3_key) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <Link
        to="/explore"
        search={{ view: 'collections' }}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 no-underline hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="size-3.5" />
        All collections
      </Link>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/50">
        <div
          className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
          style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={IMG_W * 240}
              height={IMG_H * 240}
              className="size-full object-cover object-center"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-indigo-600 via-slate-700 to-slate-900">
              <Layers className="size-16 text-white/70" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {games.map((kind) => (
                <HubGameBadge key={kind} game={kind} />
              ))}
              <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-900/90 dark:text-slate-100">
                {items.length} {items.length === 1 ? 'puzzle' : 'puzzles'}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              {collection.title}
            </h1>
            {collection.description ? (
              <p className="max-w-2xl text-sm text-white/85 sm:text-base">
                {collection.description}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((puzzle, index) => (
          <HubPuzzleCard key={puzzle.key} puzzle={puzzle} step={index + 1} />
        ))}
      </div>
    </div>
  );
}
