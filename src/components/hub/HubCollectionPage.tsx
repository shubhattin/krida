'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { getCDNUrl } from '~/constants';
import { Badge } from '~/components/ui/badge';
import { GameAppIcon } from '~/components/GameAppIcon';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';
import { cn } from '~/lib/utils';
import type { HubData } from './hub_data';
import { HUB_GAMES } from './hub_games';
import { resolveCollectionItems } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import type { HubPuzzle } from './hub_puzzles';

const [IMAGE_W, IMAGE_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

export default function HubCollectionPage({ data, slug }: { data: HubData; slug: string }) {
  const { byKey } = useHubPuzzles(data);
  const collection = data.collections.find((row) => row.slug === slug);

  if (!collection) {
    return (
      <p className="py-20 text-center font-serif text-lg text-muted-foreground italic">
        Collection not found.
      </p>
    );
  }

  const items = resolveCollectionItems(collection.items, byKey);
  const cover = collection.image
    ? getCDNUrl(collection.image.s3_key)
    : items[0]?.image
      ? getCDNUrl(items[0].image.s3_key)
      : null;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <div>
        <Link
          to="/explore"
          search={{ view: 'collections' }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All collections
        </Link>
      </div>

      <header className="flex flex-col gap-6">
        {cover ? (
          <div
            className="overflow-hidden rounded-2xl ring-1 ring-border/70"
            style={{ aspectRatio: `${IMAGE_W} / ${IMAGE_H}` }}
          >
            <Image
              src={cover}
              alt=""
              width={IMAGE_W * 280}
              height={IMAGE_H * 280}
              className="size-full object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-3 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
            Collection · {items.length} puzzle{items.length === 1 ? '' : 's'}
          </p>
          <h1 className="font-serif text-3xl leading-tight font-semibold text-balance sm:text-5xl">
            {collection.title}
          </h1>
          {collection.description ? (
            <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
              {collection.description}
            </p>
          ) : null}
        </div>
      </header>

      <ol className="flex flex-col divide-y divide-border/70 border-y border-border/70">
        {items.map((puzzle, index) => (
          <CollectionItemRow key={puzzle.key} puzzle={puzzle} index={index} />
        ))}
      </ol>
    </article>
  );
}

function CollectionItemRow({ puzzle, index }: { puzzle: HubPuzzle; index: number }) {
  const game = HUB_GAMES[puzzle.game];
  const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;
  const number = String(index + 1).padStart(2, '0');

  return (
    <li>
      <Link to={puzzle.href} className="group flex items-stretch gap-4 py-5 no-underline sm:gap-5">
        <span className="w-8 shrink-0 font-serif text-lg text-muted-foreground tabular-nums sm:w-10 sm:text-xl">
          {number}
        </span>
        <div
          className="relative w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-32"
          style={{ aspectRatio: `${IMAGE_W} / ${IMAGE_H}` }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={IMAGE_W * 80}
              height={IMAGE_H * 80}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <GameAppIcon game={game.icon} name={game.name} size="sm" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {game.name}
            </Badge>
            <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
              {game.subtitle}
            </span>
          </div>
          <p
            className={cn(
              'font-serif text-lg leading-snug font-semibold text-balance group-hover:text-primary sm:text-xl'
            )}
          >
            {puzzle.title}
          </p>
          {puzzle.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {puzzle.description}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
