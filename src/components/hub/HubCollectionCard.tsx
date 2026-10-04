'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { Layers } from 'lucide-react';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { collectionGames } from './hub_puzzles';
import { HUB_GAMES } from './hub_games';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';

const [IMG_W, IMG_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

export function HubCollectionCard({
  collection,
  className
}: {
  collection: ListedCollectionsType[number];
  className?: string;
}) {
  const games = collectionGames(collection);
  const imageUrl = collection.image ? getCDNUrl(collection.image.s3_key) : null;
  const count = collection.items.length;

  return (
    <Link
      to="/collections/$slug"
      params={{ slug: collection.slug }}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700/70 dark:bg-slate-900/60',
        className
      )}
    >
      <div
        className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800"
        style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={IMG_W * 128}
            height={IMG_H * 128}
            className="size-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-linear-to-br from-indigo-600 via-slate-700 to-slate-900">
            <Layers className="size-10 text-white/70" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-linear-to-t from-black/70 to-transparent p-3 pt-8">
          <div className="flex items-center gap-1">
            {games.map((kind) => (
              <img
                key={kind}
                src={GAME_APP_ICON_SRC[HUB_GAMES[kind].icon]}
                alt={HUB_GAMES[kind].name}
                width={22}
                height={22}
                className="size-5.5 rounded-md drop-shadow-md"
              />
            ))}
          </div>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-800 dark:bg-slate-900/90 dark:text-slate-100">
            {count} {count === 1 ? 'puzzle' : 'puzzles'}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 font-semibold text-slate-900 dark:text-slate-50">
          {collection.title}
        </p>
        {collection.description ? (
          <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
            {collection.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
