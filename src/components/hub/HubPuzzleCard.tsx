'use client';

import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Image } from '@unpic/react';
import { getCDNUrl } from '~/constants';
import { PadajalaPreviewCard } from '~/components/pages/padajala/PadajalaPreviewCard';
import { PuzzlePreviewCard } from '~/components/pages/padavali/PuzzlePreviewCard';
import { GameKindIcon } from '~/components/pages/catalog/GameKindIcon';
import type { SimpleListedPuzzle } from '~/util/cache.server/simple_game_cache';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { HubPuzzle } from './hub_puzzles';
import { HubGameBadge } from './HubGameBadge';
import { cn } from '~/lib/utils';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';

const [IMG_W, IMG_H] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

/** Preview card for the simple games: cover art (or a game-icon tile) plus title. */
function SimplePuzzlePreviewCard({
  puzzle,
  game,
  compact = false
}: {
  puzzle: SimpleListedPuzzle;
  game: SimpleGameKind;
  compact?: boolean;
}) {
  const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;
  // Titles arrive pre-transliterated to the selected script (see hubData$),
  // so first paint — including hydration — already shows the right script.
  const description = puzzle.description.trim() || null;

  return (
    <Link
      to={`/${game}/$slug`}
      params={{ slug: puzzle.slug }}
      className="group block h-full no-underline"
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-700"
          style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={IMG_W * 128}
              height={IMG_H * 128}
              className="size-full object-cover object-center"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-slate-600 via-slate-700 to-slate-800 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900">
              <GameKindIcon
                game={game}
                className={cn('rounded-lg opacity-80', compact ? 'size-10' : 'size-14')}
              />
            </div>
          )}
        </div>
        <div className={cn('flex flex-1 flex-col text-left', compact ? 'p-2' : 'p-3')}>
          <div
            className={cn(
              'line-clamp-2 font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400',
              compact ? 'text-sm' : ''
            )}
          >
            {puzzle.title}
          </div>
          {description ? (
            <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </div>
          ) : null}
        </div>
      </motion.div>
    </Link>
  );
}

/** Renders a puzzle from any game with that game's own card. */
export function HubPuzzleCard({
  puzzle,
  compact,
  showGameBadge = true,
  step
}: {
  puzzle: HubPuzzle;
  compact?: boolean;
  showGameBadge?: boolean;
  step?: number;
}) {
  return (
    <div className="relative h-full">
      {showGameBadge ? (
        <HubGameBadge game={puzzle.game} className="absolute top-2 left-2 z-10" />
      ) : null}
      {step != null ? (
        <span
          className={cn(
            'absolute top-2 z-10 flex size-7 items-center justify-center rounded-full bg-slate-950/80 text-xs font-bold text-white shadow-md',
            showGameBadge ? 'right-2' : 'left-2'
          )}
        >
          {step}
        </span>
      ) : null}
      {puzzle.game === 'padavali' ? (
        <PuzzlePreviewCard puzzle={puzzle.source} compact={compact} />
      ) : puzzle.game === 'padajala' ? (
        <PadajalaPreviewCard puzzle={puzzle.source} compact={compact} />
      ) : (
        <SimplePuzzlePreviewCard puzzle={puzzle.source} game={puzzle.game} compact={compact} />
      )}
    </div>
  );
}
