'use client';

import { useContext } from 'react';
import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { AppContext } from '~/components/AppDataContext';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import { FONT_INFO } from '~/state/script_font_data';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import { HUB_GAMES } from './hub_games';
import { GAME_BADGE } from './hub_layout';
import type { HubPuzzle } from './hub_puzzles';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import type { PublicTag } from '~/util/catalog/tags';

const [IMG_W, IMG_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

export function HubCoverImage({
  image,
  alt,
  className
}: {
  image: { s3_key: string; width?: number; height?: number } | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!image) {
    return (
      <div
        className={cn(
          'flex size-full items-center justify-center bg-linear-to-br from-zinc-600 via-zinc-800 to-zinc-950',
          className
        )}
      >
        <IoExtensionPuzzleSharp className="size-12 text-zinc-400/80" />
      </div>
    );
  }

  return (
    <Image
      src={getCDNUrl(image.s3_key)}
      alt={alt}
      width={image.width || IMG_W * 160}
      height={image.height || IMG_H * 160}
      className={cn('size-full object-cover object-center', className)}
    />
  );
}

export function HubGameBadge({ game, className }: { game: HubPuzzle['game']; className?: string }) {
  const meta = HUB_GAMES[game];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase shadow-sm',
        GAME_BADGE[game],
        className
      )}
    >
      {meta.name}
    </span>
  );
}

export function HubPosterCard({ puzzle, className }: { puzzle: HubPuzzle; className?: string }) {
  const { script } = useContext(AppContext);
  const fontClass = puzzle.game === 'padavali' ? FONT_INFO[script]?.className : undefined;

  return (
    <Link
      to={puzzle.href}
      className={cn(
        'group relative block aspect-[3/2] w-[42vw] shrink-0 snap-start overflow-hidden rounded-lg no-underline shadow-lg shadow-black/25 sm:w-56 md:w-64 lg:w-72',
        'origin-center transition-transform duration-300 ease-out',
        'hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-2xl hover:shadow-black/40',
        'motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100',
        'focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none',
        className
      )}
    >
      <HubCoverImage
        image={puzzle.image}
        alt=""
        className="transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/25 to-black/0" />
      <div className="absolute top-2 left-2">
        <HubGameBadge game={puzzle.game} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p
          className={cn('line-clamp-2 text-sm font-semibold text-white drop-shadow-sm', fontClass)}
        >
          {puzzle.title}
        </p>
      </div>
    </Link>
  );
}

export function HubPosterGridCard({ puzzle }: { puzzle: HubPuzzle }) {
  const { script } = useContext(AppContext);
  const fontClass = puzzle.game === 'padavali' ? FONT_INFO[script]?.className : undefined;

  return (
    <Link
      to={puzzle.href}
      className={cn(
        'group relative block aspect-[3/2] overflow-hidden rounded-lg no-underline shadow-lg shadow-black/20',
        'origin-center transition-transform duration-300 ease-out',
        'hover:-translate-y-1 hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/40',
        'motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      )}
    >
      <HubCoverImage
        image={puzzle.image}
        alt=""
        className="transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute top-2 left-2">
        <HubGameBadge game={puzzle.game} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
        <p className={cn('line-clamp-2 text-sm font-semibold text-white', fontClass)}>
          {puzzle.title}
        </p>
      </div>
    </Link>
  );
}

export function HubCollectionPoster({
  collection,
  className
}: {
  collection: ListedCollectionsType[number];
  className?: string;
}) {
  return (
    <Link
      to="/collections/$slug"
      params={{ slug: collection.slug }}
      className={cn(
        'group relative block aspect-[3/2] w-[42vw] shrink-0 snap-start overflow-hidden rounded-lg no-underline shadow-lg shadow-black/25 sm:w-56 md:w-64 lg:w-72',
        'origin-center transition-transform duration-300 ease-out',
        'hover:-translate-y-1.5 hover:scale-[1.04] hover:shadow-2xl hover:shadow-black/40',
        'motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100',
        className
      )}
    >
      <HubCoverImage image={collection.image} alt="" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-2 text-sm font-semibold text-white">{collection.title}</p>
        <p className="mt-0.5 text-[11px] text-white/70">
          {collection.items.length} {collection.items.length === 1 ? 'puzzle' : 'puzzles'}
        </p>
      </div>
    </Link>
  );
}

export function HubTagTile({
  tag,
  image
}: {
  tag: PublicTag & { count: number };
  image: HubPuzzle['image'];
}) {
  return (
    <Link
      to="/explore"
      search={{ tag: tag.slug }}
      className={cn(
        'group relative block aspect-[3/2] w-[38vw] shrink-0 snap-start overflow-hidden rounded-lg no-underline shadow-lg shadow-black/25 sm:w-48 md:w-56',
        'origin-center transition-transform duration-300 ease-out',
        'hover:-translate-y-1 hover:scale-[1.04] hover:shadow-2xl',
        'motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100'
      )}
    >
      <HubCoverImage image={image} alt="" />
      <div className="pointer-events-none absolute inset-0 bg-zinc-950/55 transition-colors group-hover:bg-zinc-950/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
        <p className="line-clamp-2 text-sm font-bold text-white drop-shadow-md">{tag.name}</p>
        <p className="mt-1 text-[11px] text-white/75">
          {tag.count} {tag.count === 1 ? 'puzzle' : 'puzzles'}
        </p>
      </div>
    </Link>
  );
}
