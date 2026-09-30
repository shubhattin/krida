import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { GameAppIcon } from '~/components/GameAppIcon';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import { collectionGames } from './hub_puzzles';
import { HUB_GAMES } from './hub_games';

const THUMB_W = 240;
const THUMB_H = 160;

export function CollectionFeatureCard({
  collection
}: {
  collection: ListedCollectionsType[number];
}) {
  const thumbs = collection.items
    .toSorted((a, b) => a.order_index - b.order_index)
    .flatMap((item) => (item.image ? [item.image] : []))
    .slice(0, 3);
  const games = collectionGames(collection);

  return (
    <Link
      to="/collections/$slug"
      params={{ slug: collection.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card no-underline ring-1 ring-border/80 transition-shadow hover:shadow-md"
    >
      <Mosaic thumbs={thumbs} title={collection.title} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg leading-snug font-semibold text-balance group-hover:text-primary">
            {collection.title}
          </h3>
          <span className="flex shrink-0 gap-1">
            {games.map((game) => (
              <GameAppIcon
                key={game}
                game={HUB_GAMES[game].icon}
                name={HUB_GAMES[game].name}
                size="sm"
                className="size-8 rounded-lg"
              />
            ))}
          </span>
        </div>
        {collection.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {collection.description}
          </p>
        ) : null}
        <p className="mt-auto pt-1 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {collection.items.length} puzzle{collection.items.length === 1 ? '' : 's'}
        </p>
      </div>
    </Link>
  );
}

function Mosaic({
  thumbs,
  title
}: {
  thumbs: { s3_key: string; width: number; height: number }[];
  title: string;
}) {
  if (thumbs.length === 0) {
    return (
      <div className="flex h-36 items-center bg-muted/60 px-5">
        <p className="font-serif text-xl text-muted-foreground italic">{title}</p>
      </div>
    );
  }

  if (thumbs.length === 1) {
    return (
      <div className="h-40 overflow-hidden">
        <MosaicImg image={thumbs[0]!} className="size-full" />
      </div>
    );
  }

  if (thumbs.length === 2) {
    return (
      <div className="grid h-40 grid-cols-2 gap-px bg-border/80">
        {thumbs.map((image) => (
          <MosaicImg key={image.s3_key} image={image} className="size-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid h-44 grid-cols-3 grid-rows-2 gap-px bg-border/80">
      <MosaicImg image={thumbs[0]!} className="col-span-2 row-span-2 size-full" />
      <MosaicImg image={thumbs[1]!} className="size-full" />
      <MosaicImg image={thumbs[2]!} className="size-full" />
    </div>
  );
}

function MosaicImg({ image, className }: { image: { s3_key: string }; className?: string }) {
  return (
    <Image
      src={getCDNUrl(image.s3_key)}
      alt=""
      width={THUMB_W}
      height={THUMB_H}
      className={cn('object-cover', className)}
    />
  );
}
