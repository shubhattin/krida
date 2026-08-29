'use client';

import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import type { CrosswordListedPuzzlesType } from '~/util/cache.server/crossword_cache';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';

export type CrosswordListedPuzzle = CrosswordListedPuzzlesType[number];

type Props = {
  puzzle: CrosswordListedPuzzle;
  compact?: boolean;
  onNavigate?: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
};

export function CrosswordPreviewCard({ puzzle, compact = false, onNavigate }: Props) {
  const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;
  const href = `/padajala/${encodeURIComponent(puzzle.slug)}`;
  const description = puzzle.description.trim() || null;
  const [w, h] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

  return (
    <Link
      to={href}
      onClick={(e) => onNavigate?.(e, href)}
      className="group block h-full no-underline"
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div
          className="relative w-full overflow-hidden bg-slate-100 dark:bg-slate-700"
          style={{ aspectRatio: `${w} / ${h}` }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={w * 128}
              height={h * 128}
              className="size-full object-cover object-center"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-slate-600 via-slate-700 to-slate-800 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900">
              <IoExtensionPuzzleSharp
                className={cn(
                  'text-slate-300/80 dark:text-slate-400/70',
                  compact ? 'size-10' : 'size-12 sm:size-14'
                )}
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
