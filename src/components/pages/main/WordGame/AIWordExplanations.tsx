'use client';

import { useContext, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { transliterate } from 'lipilekhika';
import { client_q } from '~/api/client';
import { AppContext } from '~/components/AppDataContext';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { completed_atom, original_word_list_atom } from './game_state';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { Sparkles, Languages, BookOpen, AlertCircle, Lock } from 'lucide-react';
import { cn } from '~/lib/utils';

type Props = {
  puzzle_id: number;
  puzzle_slug: string;
};

const SECTION_ID = 'ai-meanings';

export const AIWordExplanations = ({ puzzle_id, puzzle_slug }: Props) => {
  const { script } = useContext(AppContext);
  const [completed] = useAtom(completed_atom);
  const [wordList] = useAtom(original_word_list_atom);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [transliteratedWords, setTransliteratedWords] = useState<Record<string, string>>({});

  const isSectionExpanded = openSections.includes(SECTION_ID);

  const { data, isLoading, error, refetch } = client_q.public_ai.get_puzzle_word_meanings.useQuery(
    {
      puzzle_id,
      puzzle_slug
    },
    {
      staleTime: Infinity
    }
  );

  useEffect(() => {
    if (!data?.words) return;
    let active = true;
    const run = async () => {
      const entries = await Promise.all(
        data.words.map(async (w) => {
          const tWord = await transliterate(w.word, DEFAULT_DATA_SCRIPT, script!);
          return [w.word, tWord];
        })
      );
      if (active) {
        setTransliteratedWords(Object.fromEntries(entries));
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [data?.words, script]);

  return (
    <AnimatePresence mode="wait">
      {!completed ? (
        /* ─── Teaser (locked) state ─── */
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
            {/* Subtle shimmer overlay */}
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
        /* ─── Expanded meanings state ─── */
        <motion.div
          key="meanings"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="mt-4 w-full sm:mt-5"
        >
          <div
            className={cn(
              'overflow-hidden rounded-2xl',
              'border border-violet-200/30 dark:border-violet-500/12',
              'bg-linear-to-r from-white/90 to-slate-50/80',
              'dark:from-slate-900/90 dark:to-slate-900/70',
              'shadow-md backdrop-blur-sm'
            )}
          >
            <Accordion
              value={openSections}
              onValueChange={setOpenSections}
              multiple
              className="w-full"
            >
              <AccordionItem value={SECTION_ID} className="border-0">
                {/* ─── Header trigger ─── */}
                <AccordionTrigger
                  className={cn(
                    'flex w-full items-center gap-3 rounded-none border-0 px-3.5 py-3 shadow-none outline-none',
                    'hover:no-underline focus-visible:ring-0 sm:px-4 sm:py-3.5',
                    'transition-colors duration-200',
                    'aria-expanded:border-b aria-expanded:border-violet-200/25 dark:aria-expanded:border-violet-500/10'
                  )}
                >
                  {/* Icon with gradient background */}
                  <div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9',
                      'bg-linear-to-br from-violet-500 to-fuchsia-500',
                      'shadow-sm shadow-violet-500/25 dark:shadow-violet-500/15'
                    )}
                  >
                    <BookOpen className="size-4 text-white sm:size-[18px]" />
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
                </AccordionTrigger>

                {/* ─── Content panel ─── */}
                <AccordionContent className="px-0 pb-0">
                  <div className="max-h-[min(280px,45vh)] overflow-y-auto overscroll-contain px-2.5 py-2 sm:max-h-[min(320px,50vh)] sm:px-3 sm:py-2.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-300/40 dark:[&::-webkit-scrollbar-thumb]:bg-violet-700/40">
                    {isLoading ? (
                      /* ─── Loading skeletons ─── */
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              'animate-pulse rounded-xl px-3 py-3',
                              'bg-linear-to-r from-violet-100/40 to-fuchsia-100/30',
                              'dark:from-violet-950/30 dark:to-fuchsia-950/20'
                            )}
                          >
                            <div className="mb-2 h-4 w-1/3 rounded-md bg-violet-200/60 dark:bg-violet-800/40" />
                            <div className="h-2.5 w-4/5 rounded-md bg-violet-100/70 dark:bg-violet-900/30" />
                          </div>
                        ))}
                      </div>
                    ) : error ? (
                      /* ─── Error state ─── */
                      <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
                        <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                          <AlertCircle className="size-5 text-rose-500 dark:text-rose-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 sm:text-sm dark:text-slate-300">
                            Failed to load explanations
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                            Something went wrong while fetching AI insights.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => refetch()}
                          className={cn(
                            'mt-1 rounded-lg px-4 py-1.5',
                            'bg-linear-to-r from-violet-600 to-fuchsia-600',
                            'text-[11px] font-semibold text-white sm:text-xs',
                            'shadow-sm shadow-violet-500/25',
                            'transition-all hover:shadow-md hover:brightness-110 active:scale-[0.97]'
                          )}
                        >
                          Retry
                        </button>
                      </div>
                    ) : data?.words && data.words.length > 0 ? (
                      /* ─── Word list ─── */
                      <Accordion multiple defaultValue={[]} className="space-y-1">
                        {data.words.map((item, idx) => {
                          const transliteratedWord = transliteratedWords[item.word] || item.word;
                          const isDifferentScript = script !== 'Devanagari';

                          return (
                            <AccordionItem
                              key={`${item.word}-${idx}`}
                              value={`word-${idx}`}
                              className="border-0"
                            >
                              <AccordionTrigger
                                className={cn(
                                  'flex w-full items-center gap-2.5 border-0 px-3 py-2 shadow-none outline-none',
                                  'rounded-xl text-left hover:no-underline focus-visible:ring-0',
                                  'transition-colors duration-150',
                                  'hover:bg-violet-50/70 dark:hover:bg-violet-950/30',
                                  'sm:px-3.5 sm:py-2.5'
                                )}
                              >
                                {/* Word number indicator */}
                                <span
                                  className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-md',
                                    'bg-violet-100/80 dark:bg-violet-900/40',
                                    'text-[9px] font-bold text-violet-500 dark:text-violet-400'
                                  )}
                                >
                                  {idx + 1}
                                </span>
                                <span className="min-w-0 flex-1 text-sm leading-snug font-semibold wrap-break-word text-slate-800 dark:text-slate-100">
                                  {transliteratedWord}
                                </span>
                                {isDifferentScript && (
                                  <span className="shrink-0 text-[10px] font-normal text-slate-400 sm:text-xs dark:text-slate-500">
                                    ({item.word})
                                  </span>
                                )}
                              </AccordionTrigger>

                              <AccordionContent className="px-3 pb-2 sm:px-3.5">
                                <div
                                  className={cn(
                                    'flex items-start gap-2.5 rounded-xl px-3 py-2.5 sm:px-3.5',
                                    'bg-linear-to-r from-violet-50/70 to-fuchsia-50/40',
                                    'dark:from-violet-950/25 dark:to-fuchsia-950/15',
                                    'border-l-2 border-violet-400/50 dark:border-violet-500/30'
                                  )}
                                >
                                  <BookOpen className="mt-0.5 size-3.5 shrink-0 text-violet-500/80 dark:text-violet-400/70" />
                                  <p className="text-[11px] leading-relaxed text-slate-600 sm:text-xs dark:text-slate-300">
                                    {item.meaning}
                                  </p>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    ) : (
                      /* ─── Empty state ─── */
                      <div className="px-4 py-6 text-center">
                        <Languages className="mx-auto mb-2 size-5 text-slate-400 dark:text-slate-500" />
                        <p className="text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
                          No word explanations available for this puzzle.
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
