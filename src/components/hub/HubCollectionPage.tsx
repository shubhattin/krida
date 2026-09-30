'use client';

import { useContext } from 'react';
import { Link } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { AppContext } from '~/components/AppDataContext';
import { FONT_INFO } from '~/state/script_font_data';
import { cn } from '~/lib/utils';
import type { HubData } from './hub_data';
import { HUB_GAMES } from './hub_games';
import { HUB_FULL_BLEED } from './hub_layout';
import { HubCoverImage, HubGameBadge } from './HubPosterCard';
import { collectionGames, resolveCollectionItems, type HubPuzzle } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';

/** Wide banner plus an ordered “episode” list of mixed-game puzzles. */
export default function HubCollectionPage({ data, slug }: { data: HubData; slug: string }) {
  const { byKey } = useHubPuzzles(data);
  const collection = data.collections.find((row) => row.slug === slug);

  if (!collection) {
    return <p className="py-16 text-center text-muted-foreground">Collection not found.</p>;
  }

  const items = resolveCollectionItems(collection.items, byKey);
  const games = collectionGames(collection);

  return (
    <div className="flex flex-col gap-8 pb-16">
      <section className={cn(HUB_FULL_BLEED, '-mt-16')}>
        <div className="relative min-h-[52svh] overflow-hidden sm:min-h-[58svh]">
          <div className="absolute inset-0">
            <HubCoverImage image={collection.image} alt="" />
            <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/55 to-black/20" />
            <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-transparent to-black/40" />
          </div>
          <div className="relative z-10 mx-auto flex min-h-[52svh] max-w-5xl flex-col justify-end gap-4 px-4 pt-24 pb-10 text-white sm:min-h-[58svh] sm:px-8 sm:pb-14">
            <Link
              to="/explore"
              search={{ view: 'collections' }}
              className="w-fit text-sm text-white/70 no-underline hover:text-white"
            >
              All collections
            </Link>
            <h1 className="font-serif text-4xl font-bold sm:text-5xl">{collection.title}</h1>
            {collection.description ? (
              <p className="max-w-2xl text-sm text-white/80 sm:text-base">
                {collection.description}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {games.map((game) => (
                <HubGameBadge key={game} game={game} />
              ))}
              <span className="text-sm text-white/70">
                {items.length} {items.length === 1 ? 'puzzle' : 'puzzles'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <ol className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 sm:px-8">
        {items.map((puzzle, index) => (
          <EpisodeRow key={puzzle.key} puzzle={puzzle} index={index} />
        ))}
      </ol>
    </div>
  );
}

function EpisodeRow({ puzzle, index }: { puzzle: HubPuzzle; index: number }) {
  const { script } = useContext(AppContext);
  const fontClass = puzzle.game === 'padavali' ? FONT_INFO[script]?.className : undefined;
  const game = HUB_GAMES[puzzle.game];

  return (
    <li>
      <Link
        to={puzzle.href}
        className="group flex items-stretch gap-3 rounded-xl p-2 no-underline transition-colors hover:bg-black/5 sm:gap-4 sm:p-3 dark:hover:bg-white/5"
      >
        <span className="flex w-7 shrink-0 items-center justify-center text-sm font-semibold text-muted-foreground tabular-nums sm:w-9 sm:text-base">
          {index + 1}
        </span>
        <div className="aspect-[3/2] w-28 shrink-0 overflow-hidden rounded-md shadow-md sm:w-40">
          <HubCoverImage image={puzzle.image} alt="" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('line-clamp-1 font-semibold', fontClass)}>{puzzle.title}</p>
            <HubGameBadge game={puzzle.game} className="hidden sm:inline-flex" />
          </div>
          {puzzle.description ? (
            <p className={cn('line-clamp-2 text-sm text-muted-foreground', fontClass)}>
              {puzzle.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{game.subtitle}</p>
          )}
        </div>
        <div className="hidden shrink-0 items-center sm:flex">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm font-medium text-secondary-foreground opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="size-4 fill-current" />
            Play
          </span>
        </div>
      </Link>
    </li>
  );
}
