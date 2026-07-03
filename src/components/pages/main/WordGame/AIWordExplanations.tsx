'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { completed_atom, practice_mode_atom } from './game_state';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { Sparkles, BookOpen } from 'lucide-react';
import { cn } from '~/lib/utils';
import { useWordMeanings } from './useWordMeanings';
import { WordMeaningsList } from './WordMeaningsList';

type Props = {
  puzzle_id: number;
  puzzle_slug: string;
};

const SECTION_ID = 'ai-meanings';

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
            practiceMode={practiceMode && !completed}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

type PanelProps = {
  meanings: ReturnType<typeof useWordMeanings>;
  openSections: string[];
  onOpenSectionsChange: (sections: string[]) => void;
  practiceMode?: boolean;
  compact?: boolean;
  defaultOpen?: boolean;
  tone?: 'violet' | 'warm';
  showAiBadge?: boolean;
};

export function WordMeaningsPanel({
  meanings,
  openSections,
  onOpenSectionsChange,
  practiceMode = false,
  compact = false,
  defaultOpen = false,
  tone = 'violet',
  showAiBadge = true
}: PanelProps) {
  const warm = tone === 'warm';
  const sectionValue = defaultOpen ? [SECTION_ID] : openSections;
  const handleChange = defaultOpen ? undefined : onOpenSectionsChange;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl',
        warm
          ? 'border border-amber-200/40 dark:border-amber-500/15'
          : 'border border-violet-200/30 dark:border-violet-500/12',
        'bg-linear-to-r from-white/90 to-slate-50/80',
        'dark:from-slate-900/90 dark:to-slate-900/70',
        'shadow-md backdrop-blur-sm'
      )}
    >
      <Accordion value={sectionValue} onValueChange={handleChange} multiple className="w-full">
        <AccordionItem value={SECTION_ID} className="border-0">
          <AccordionTrigger
            className={cn(
              'flex w-full items-center gap-3 rounded-none border-0 px-3.5 py-3 shadow-none outline-none',
              'hover:no-underline focus-visible:ring-0 sm:px-4 sm:py-3.5',
              'transition-colors duration-200',
              warm
                ? 'aria-expanded:border-b aria-expanded:border-amber-200/30 dark:aria-expanded:border-amber-500/15'
                : 'aria-expanded:border-b aria-expanded:border-violet-200/25 dark:aria-expanded:border-violet-500/10'
            )}
          >
            <div
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9',
                warm
                  ? 'bg-linear-to-br from-amber-500 to-orange-500 shadow-sm shadow-amber-500/25 dark:shadow-amber-500/15'
                  : 'bg-linear-to-br from-violet-500 to-fuchsia-500 shadow-sm shadow-violet-500/25 dark:shadow-violet-500/15'
              )}
            >
              <BookOpen className="size-4 text-white sm:size-[18px]" />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3 className="text-sm font-bold tracking-tight text-slate-800 sm:text-[15px] dark:text-slate-100">
                  Word Meanings
                </h3>
                {showAiBadge ? (
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
                ) : null}
                {practiceMode ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800 uppercase dark:bg-amber-900/40 dark:text-amber-200">
                    Practice
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">
                Cultural context & word origins
              </p>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-0 pb-0">
            <div
              className={cn(
                'overflow-y-auto overscroll-contain px-2.5 py-2 sm:px-3 sm:py-2.5',
                warm
                  ? '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-300/40 dark:[&::-webkit-scrollbar-thumb]:bg-amber-700/40'
                  : '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-300/40 dark:[&::-webkit-scrollbar-thumb]:bg-violet-700/40',
                compact
                  ? 'max-h-[min(240px,40vh)]'
                  : 'max-h-[min(280px,45vh)] sm:max-h-[min(320px,50vh)]'
              )}
            >
              <WordMeaningsList meanings={meanings} compact={compact} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
