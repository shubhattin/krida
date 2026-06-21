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
import { Sparkles, Brain, Languages, BookOpen, AlertCircle } from 'lucide-react';
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
      enabled: completed && isSectionExpanded,
      staleTime: Infinity
    }
  );

  useEffect(() => {
    if (!data?.words || !isSectionExpanded) return;
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
  }, [data?.words, isSectionExpanded, script]);

  return (
    <AnimatePresence mode="wait">
      {!completed ? (
        <motion.div
          key="teaser"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-violet-200/30 bg-violet-50/40 px-3 py-2 text-center text-[11px] text-slate-500 sm:text-xs dark:border-violet-500/15 dark:bg-violet-950/20 dark:text-slate-400"
        >
          <Languages className="size-3 shrink-0 text-violet-500/80 dark:text-violet-400/80" />
          <span className="leading-snug font-medium">
            AI word meanings unlock when you finish the puzzle
          </span>
          <Sparkles className="size-3 shrink-0 text-amber-500/90 dark:text-amber-400/90" />
        </motion.div>
      ) : (
        <motion.div
          key="meanings"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="mt-4 w-full overflow-hidden rounded-2xl border border-violet-200/40 bg-linear-to-b from-violet-50/60 to-white/80 shadow-md backdrop-blur-sm sm:mt-5 dark:border-violet-500/15 dark:from-violet-950/30 dark:to-slate-900/60"
        >
          <Accordion
            value={openSections}
            onValueChange={setOpenSections}
            multiple
            className="w-full"
          >
            <AccordionItem value={SECTION_ID} className="border-0">
              <AccordionTrigger
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-none border-0 px-3 py-2.5 shadow-none outline-none',
                  'hover:no-underline focus-visible:ring-0 sm:px-3.5 sm:py-3',
                  'aria-expanded:border-b aria-expanded:border-violet-200/30 dark:aria-expanded:border-violet-500/10'
                )}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 sm:size-8 dark:bg-violet-900/50 dark:text-violet-300">
                  <Brain className="size-3.5 sm:size-4" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h3 className="text-xs font-bold text-violet-900 sm:text-sm dark:text-violet-100">
                      AI Word Meanings
                    </h3>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100/80 px-1.5 py-px text-[9px] font-semibold text-violet-700 sm:text-[10px] dark:bg-violet-900/40 dark:text-violet-300">
                      <Sparkles className="size-2" />
                      AI
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">
                    Learn More about the cultural context
                  </p>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-0 pb-0">
                <div className="max-h-[min(280px,45vh)] overflow-y-auto overscroll-contain px-2 py-2 sm:max-h-[min(320px,50vh)] sm:px-2.5 sm:py-2.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-300/50 dark:[&::-webkit-scrollbar-thumb]:bg-violet-700/50">
                  {isLoading ? (
                    <div className="space-y-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="animate-pulse rounded-lg bg-violet-100/50 px-3 py-2.5 dark:bg-violet-950/30"
                        >
                          <div className="mb-1.5 h-3.5 w-1/3 rounded bg-violet-200/70 dark:bg-violet-800/50" />
                          <div className="h-2.5 w-4/5 rounded bg-violet-100/80 dark:bg-violet-900/40" />
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-3 py-6 text-center">
                      <AlertCircle className="size-6 text-rose-500 dark:text-rose-400" />
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
                        className="mt-1 rounded-lg bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-violet-700 active:scale-[0.98] sm:text-xs"
                      >
                        Retry
                      </button>
                    </div>
                  ) : data?.words && data.words.length > 0 ? (
                    <Accordion
                      multiple
                      defaultValue={[]}
                      className="divide-y divide-violet-200/40 dark:divide-violet-500/10"
                    >
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
                                'flex w-full items-center gap-2 rounded-lg border-0 px-2.5 py-2 shadow-none outline-none',
                                'text-left hover:bg-violet-50/60 hover:no-underline focus-visible:ring-0',
                                'sm:px-3 sm:py-2.5 dark:hover:bg-violet-950/25'
                              )}
                            >
                              <span className="min-w-0 flex-1 text-sm leading-snug font-semibold wrap-break-word text-slate-800 dark:text-slate-100">
                                {transliteratedWord}
                              </span>
                              {isDifferentScript && (
                                <span className="shrink-0 text-[10px] font-normal text-slate-400 sm:text-xs dark:text-slate-500">
                                  ({item.word})
                                </span>
                              )}
                            </AccordionTrigger>
                            <AccordionContent className="px-2.5 pb-2.5 sm:px-3">
                              <div className="flex items-start gap-2 rounded-lg bg-violet-50/50 px-2.5 py-2 sm:px-3 dark:bg-violet-950/20">
                                <BookOpen className="mt-0.5 size-3.5 shrink-0 text-violet-500 dark:text-violet-400" />
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
                    <div className="px-3 py-5 text-center text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
                      No word explanations available for this puzzle.
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
