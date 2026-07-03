'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { AlertCircle, BookOpen, Languages } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { useWordMeanings } from './useWordMeanings';

type WordMeaningsQuery = ReturnType<typeof useWordMeanings>;

type Props = {
  meanings: WordMeaningsQuery;
  compact?: boolean;
};

export function WordMeaningsList({ meanings, compact = false }: Props) {
  const { data, isLoading, error, refetch, transliteratedWords, script } = meanings;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
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
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-6 text-center">
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
    );
  }

  if (!data?.words || data.words.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <Languages className="mx-auto mb-2 size-5 text-slate-400 dark:text-slate-500" />
        <p className="text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
          No word explanations available for this puzzle.
        </p>
      </div>
    );
  }

  const isDifferentScript = script !== 'Devanagari';

  return (
    <Accordion multiple defaultValue={[]} className="flex flex-col gap-1">
      {data.words.map((item, idx) => {
        const transliteratedWord = transliteratedWords[item.word] || item.word;

        return (
          <AccordionItem key={`${item.word}-${idx}`} value={`word-${idx}`} className="border-0">
            <AccordionTrigger
              className={cn(
                'flex w-full items-center gap-2.5 border-0 px-3 py-2 shadow-none outline-none',
                'rounded-xl text-left hover:no-underline focus-visible:ring-0',
                'transition-colors duration-150',
                'hover:bg-violet-50/70 dark:hover:bg-violet-950/30',
                compact ? 'sm:px-3 sm:py-2' : 'sm:px-3.5 sm:py-2.5'
              )}
            >
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
              {isDifferentScript ? (
                <span className="shrink-0 text-[10px] font-normal text-slate-400 sm:text-xs dark:text-slate-500">
                  ({item.word})
                </span>
              ) : null}
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
  );
}
