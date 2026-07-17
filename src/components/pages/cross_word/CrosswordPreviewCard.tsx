'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import type { CrosswordListedPuzzlesType } from '~/util/cache.server/crossword_cache';

export type CrosswordListedPuzzle = CrosswordListedPuzzlesType[number];

type Props = {
  puzzle: CrosswordListedPuzzle;
  compact?: boolean;
  onNavigate?: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
};

export function CrosswordPreviewCard({ puzzle, compact = false, onNavigate }: Props) {
  const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;
  const href = `/crossword/${encodeURIComponent(puzzle.slug)}`;
  const description = puzzle.description?.trim() || 'Play this crossword puzzle';

  return (
    <Link
      href={href}
      onClick={(e) => onNavigate?.(e, href)}
      className="group block h-full no-underline"
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="relative aspect-3/2 w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-full object-cover object-center" />
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40">
              <IoExtensionPuzzleSharp
                className={cn(
                  'text-violet-500/70 dark:text-violet-400/70',
                  compact ? 'size-10' : 'size-12 sm:size-14'
                )}
              />
            </div>
          )}
        </div>
        <div className={cn('flex flex-1 flex-col text-left', compact ? 'p-2' : 'p-3')}>
          <div
            className={cn(
              'line-clamp-2 min-h-[2.5em] font-semibold text-slate-900 group-hover:text-violet-600 dark:text-slate-100 dark:group-hover:text-violet-400',
              compact ? 'text-sm' : 'text-base'
            )}
          >
            {puzzle.title}
          </div>
          {/* Always reserve 2 lines so card heights stay consistent */}
          <div
            className={cn(
              'mt-1 line-clamp-2 min-h-[2.5em] text-xs leading-snug text-slate-500 dark:text-slate-400'
            )}
          >
            {description}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
