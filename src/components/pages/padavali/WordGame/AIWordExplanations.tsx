'use client';

import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { completed_atom, game_session_nonce_atom, practice_mode_atom } from './game_state';
import { Sparkles, BookOpen } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useWordMeanings } from './useWordMeanings';
import { WordMeaningsPanel } from './WordMeaningsPanel';

type Props = {
  puzzle_id: number;
  puzzle_slug: string;
};

type CompletedMeaningsProps = {
  puzzle_id: number;
  puzzle_slug: string;
  practiceMode: boolean;
};

const CompletedMeanings = ({ puzzle_id, puzzle_slug, practiceMode }: CompletedMeaningsProps) => {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [celebrate, setCelebrate] = useState(true);
  const meanings = useWordMeanings(puzzle_id, puzzle_slug);

  useEffect(() => {
    const timeoutId = setTimeout(() => setCelebrate(false), 15_000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative mt-4 w-full sm:mt-5"
    >
      <motion.div
        animate={
          celebrate
            ? {
                boxShadow: [
                  '0 0 0 0 rgba(139, 92, 246, 0)',
                  '0 0 0 5px rgba(139, 92, 246, 0.25)',
                  '0 0 0 0 rgba(139, 92, 246, 0)',
                  '0 0 0 5px rgba(139, 92, 246, 0.2)',
                  '0 0 0 0 rgba(139, 92, 246, 0)'
                ]
              }
            : { boxShadow: '0 0 0 0 rgba(139, 92, 246, 0)' }
        }
        transition={
          celebrate ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }
        }
        className="relative overflow-hidden rounded-2xl"
      >
        {celebrate ? (
          <motion.div
            key="shine"
            aria-hidden
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ x: ['-120%', '140%'], opacity: [0, 0.85, 0] }}
            transition={{
              duration: 2.8,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 0.9
            }}
            className="bg-linear-to-r pointer-events-none absolute inset-y-0 z-20 w-2/5 skew-x-[-18deg] from-transparent via-white/50 to-transparent dark:via-violet-200/20"
          />
        ) : null}

        {celebrate ? (
          <motion.div
            key="wash"
            aria-hidden
            initial={{ opacity: 0.45 }}
            animate={{ opacity: [0.45, 0, 0.45] }}
            transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-2 ring-violet-400/45 dark:ring-violet-400/30"
          />
        ) : null}

        <div className="relative z-0">
          <WordMeaningsPanel
            meanings={meanings}
            openSections={openSections}
            onOpenSectionsChange={(sections) => {
              setOpenSections(sections);
              if (sections.length > 0) setCelebrate(false);
            }}
            practiceMode={practiceMode}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AIWordExplanations = ({ puzzle_id, puzzle_slug }: Props) => {
  const [completed] = useAtom(completed_atom);
  const [practiceMode] = useAtom(practice_mode_atom);
  const [gameSessionNonce] = useAtom(game_session_nonce_atom);

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
              'dark:border-violet-500/12 border border-violet-200/30',
              'bg-linear-to-r from-white/90 to-slate-50/80',
              'dark:from-slate-900/90 dark:to-slate-900/70',
              'shadow-md backdrop-blur-sm',
              'px-4 py-3 sm:px-5 sm:py-4'
            )}
          >
            <div className="bg-linear-to-r dark:via-white/3 pointer-events-none absolute inset-0 from-transparent via-white/10 to-transparent" />

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
                        'text-[9px] font-bold uppercase tracking-wide text-violet-600 sm:text-[10px]',
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
        <CompletedMeanings
          key={gameSessionNonce}
          puzzle_id={puzzle_id}
          puzzle_slug={puzzle_slug}
          practiceMode={practiceMode}
        />
      )}
    </AnimatePresence>
  );
};
