'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { AppContext } from '~/components/AppDataContext';
import { cn } from '~/lib/utils';
import { FONT_INFO } from '~/state/script_font_data';
import { getCDNUrl } from '~/constants';
import { useAtom } from 'jotai';
import {
  started_atom,
  completed_atom,
  pending_navigation_url_atom
} from '~/components/pages/padavali/WordGame/game_state';
import {
  PUZZLE_CARD_IMAGE_ASPECT_RATIO,
  type DisplayPuzzle
} from '~/components/pages/padavali/listed_puzzle_display';

type Props = {
  puzzle: DisplayPuzzle;
  compact?: boolean;
};

export const PuzzlePreviewCard = ({ puzzle, compact = false }: Props) => {
  const { script } = useContext(AppContext);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [, setPendingUrl] = useAtom(pending_navigation_url_atom);

  const font_info = FONT_INFO[script!];
  const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;
  const [w, h] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (started && !completed) {
      e.preventDefault();
      setPendingUrl(`/padavali/${puzzle.slug}`);
    }
  };

  return (
    <Link
      href={`/padavali/${puzzle.slug}`}
      onClick={handleClick}
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
            <img src={imageUrl} alt="" className="size-full object-cover object-center" />
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
              compact ? 'text-sm' : '',
              font_info.className
            )}
          >
            {puzzle.title}
          </div>
          {puzzle.description ? (
            <div
              className={cn(
                'mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400',
                font_info.className
              )}
            >
              {puzzle.description}
            </div>
          ) : null}
        </div>
      </motion.div>
    </Link>
  );
};
