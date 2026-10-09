'use client';

import { useEffect } from 'react';
import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Layers } from 'lucide-react';
import { useSetAtom } from 'jotai';
import { getCDNUrl } from '~/constants';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { collectionGames, resolveCollectionItems } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { HubGameBadge } from './HubGameBadge';
import { active_collection_atom } from '~/components/pages/catalog/catalog_admin_state';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';

const [IMG_W, IMG_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

/** Public collection page: ordered puzzles from every game in the collection. */
export default function HubCollectionPage({ data, slug }: { data: HubData; slug: string }) {
  const { byKey } = useHubPuzzles(data);
  const setActiveCollection = useSetAtom(active_collection_atom);
  const collection = data.collections.find((row) => row.slug === slug);

  useEffect(() => {
    if (!collection) return;
    setActiveCollection({ uid: collection.uid, title: collection.title });
    return () => setActiveCollection(null);
  }, [collection, setActiveCollection]);

  if (!collection) {
    return <p className="py-16 text-center text-slate-500">Collection not found.</p>;
  }

  const items = resolveCollectionItems(collection.items, byKey);
  const games = collectionGames(collection);
  const imageUrl = collection.image ? getCDNUrl(collection.image.s3_key) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <Link
        to="/puzzles"
        search={{ view: 'collections' }}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 no-underline hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="size-3.5" />
        All collections
      </Link>

      <section className="flex items-start gap-4 rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm sm:items-center sm:gap-5 sm:p-5 dark:border-slate-800/80 dark:bg-slate-900/50">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-28 sm:w-28 dark:bg-slate-800">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={IMG_W * 96}
              height={IMG_H * 96}
              className="size-full object-cover object-center"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-indigo-600 via-slate-700 to-slate-900">
              <Layers className="size-8 text-white/70" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {games.map((kind) => (
              <HubGameBadge key={kind} game={kind} />
            ))}
            <span className="rounded-full bg-slate-900/5 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
              {items.length} {items.length === 1 ? 'puzzle' : 'puzzles'}
            </span>
          </div>
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
            {collection.title}
          </h1>
          {collection.description ? (
            <p className="line-clamp-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {collection.description}
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((puzzle) => (
          <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
        ))}
      </div>
    </div>
  );
}
