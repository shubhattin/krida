'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { completed_atom, practice_mode_atom } from './game_state';
import { Sparkles, BookOpen } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useWordMeanings } from './useWordMeanings';
import { WordMeaningsPanel } from './WordMeaningsPanel';

type Props = {
  puzzle_id: number;
  puzzle_slug: string;
};

export const AIWordExplanations = ({ puzzle_id, puzzle_slug }: Props) => {
  const [completed] = useAtom(completed_atom);
  const [practiceMode] = useAtom(practice_mode_atom);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const meanings = useWordMeanings(puzzle_id, puzzle_slug);

  const unlocked = completed;

  return (
    <AnimatePresence mode="wait">
      {!unlocked ? (
        <motion.div
          key="teaser"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mt-4 sm:mt-5"
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl',
              'border border-violet-200/30 dark:border-violet-500/12',
              'bg-linear-to-r from-white/90 to-slate-50/80',
              'dark:from-slate-900/90 dark:to-slate-900/70',
              'shadow-md backdrop-blur-sm',
              'px-4 py-3 sm:px-5 sm:py-4'
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent dark:via-white/3" />

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9',
                    'bg-linear-to-br from-violet-500 to-fuchsia-500',
                    'shadow-sm shadow-violet-500/25 dark:shadow-violet-500/15'
                  )}
                >
                  <BookOpen className="size-4 text-white sm:size-[18px]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-x-2">
                    <h3 className="text-sm font-bold tracking-tight text-slate-800 sm:text-[15px] dark:text-slate-100">
                      Word Meanings
                    </h3>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                        'bg-linear-to-r from-violet-100 to-fuchsia-100',
                        'dark:from-violet-900/50 dark:to-fuchsia-900/40',
                        'text-[9px] font-bold tracking-wide text-violet-600 uppercase sm:text-[10px]',
                        'dark:text-violet-300'
                      )}
                    >
                      <Sparkles className="size-2.5" />
                      AI
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">
                    Cultural context & word origins
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-violet-100/50 bg-violet-50/50 px-3 py-1.5 dark:border-violet-900/30 dark:bg-violet-950/20">
                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  Complete puzzle to unlock!
                </span>
                <Sparkles className="size-3.5 shrink-0 animate-pulse text-amber-500/80 dark:text-amber-400/70" />
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="meanings"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="mt-4 w-full sm:mt-5"
        >
          <WordMeaningsPanel
            meanings={meanings}
            openSections={openSections}
            onOpenSectionsChange={setOpenSections}
            practiceMode={practiceMode}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
