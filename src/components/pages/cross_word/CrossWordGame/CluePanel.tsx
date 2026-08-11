'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { transliterate } from 'lipilekhika';
import { cn } from '~/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { active_focus_atom, numbered_entries_atom, solved_entry_ids_atom } from './game_state';
import type { useCrossWordGame } from './useCrossWordGame';
import type { MoreHintsQuery } from './useMoreHints';
import type { NumberedEntry } from '~/util/cross_word/game_model';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';

type ClueFilter = 'all' | 'across' | 'down';

type CluePanelProps = {
  game: ReturnType<typeof useCrossWordGame>;
  moreHints: MoreHintsQuery;
  className?: string;
};

const FILTERS: { id: ClueFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'across', label: 'Across' },
  { id: 'down', label: 'Down' }
];

const ROMANIZED_SCRIPT = 'Romanized' as const;
const romanizedCache = new Map<string, string>();

function sortClues(entries: NumberedEntry[], solvedIds: string[]) {
  const solvedSet = new Set(solvedIds);
  return entries.toSorted((a, b) => {
    const aSolved = solvedSet.has(a.id);
    const bSolved = solvedSet.has(b.id);
    if (aSolved !== bSolved) return aSolved ? 1 : -1;
    if (a.number !== b.number) return a.number - b.number;
    if (a.direction !== b.direction) return a.direction === 'across' ? -1 : 1;
    return 0;
  });
}

function SolvedRomanizedWord({ wordDev }: { wordDev: string }) {
  const trimmed = wordDev.trim();
  const [romanized, setRomanized] = useState(() =>
    trimmed ? (romanizedCache.get(trimmed) ?? null) : null
  );

  useEffect(() => {
    if (!trimmed) {
      setRomanized(null);
      return;
    }
    const cached = romanizedCache.get(trimmed);
    if (cached) {
      setRomanized(cached);
      return;
    }

    let active = true;
    void transliterate(trimmed, DEFAULT_DATA_SCRIPT, ROMANIZED_SCRIPT).then((result) => {
      if (!active) return;
      romanizedCache.set(trimmed, result);
      setRomanized(result);
    });
    return () => {
      active = false;
    };
  }, [trimmed]);

  if (!trimmed || !romanized) return null;

  return (
    <motion.span
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'mt-1 block text-[0.8rem] leading-snug font-medium tracking-wide no-underline',
        'text-emerald-700/90 dark:text-emerald-300/90'
      )}
      aria-label={`Romanized Sanskrit: ${romanized}`}
    >
      {romanized}
    </motion.span>
  );
}

function MoreHintPopover({ entryId, moreHints }: { entryId: string; moreHints: MoreHintsQuery }) {
  const hint = moreHints.hintByEntryId[entryId];
  const { isLoading, isFetching, error, refetch } = moreHints;
  const pending = isLoading || (isFetching && !hint);

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label="Show AI more hint"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5',
          'border-violet-300/70 bg-linear-to-r from-violet-100 to-fuchsia-100',
          'text-[0.6rem] font-bold tracking-wide text-violet-700 uppercase',
          'shadow-sm transition-colors outline-none',
          'hover:from-violet-200/90 hover:to-fuchsia-200/80',
          'focus-visible:ring-2 focus-visible:ring-violet-400/50',
          'dark:border-violet-500/40 dark:from-violet-900/50 dark:to-fuchsia-900/40 dark:text-violet-200',
          'dark:hover:from-violet-800/60 dark:hover:to-fuchsia-800/50'
        )}
      >
        <Sparkles className="-mt-0.5 size-2.5" />
        More
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-64 gap-2 p-3"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">More hint</p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              'bg-linear-to-r from-violet-100 to-fuchsia-100',
              'dark:from-violet-900/50 dark:to-fuchsia-900/40',
              'text-[9px] font-bold tracking-wide text-violet-600 uppercase',
              'dark:text-violet-300'
            )}
          >
            <Sparkles className="size-2.5" />
            AI
          </span>
        </div>

        {pending ? (
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded-md bg-violet-200/50 dark:bg-violet-800/40" />
            <div className="h-3 w-4/5 animate-pulse rounded-md bg-violet-100/60 dark:bg-violet-900/30" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
              <span>Could not load this hint.</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void refetch();
              }}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-semibold text-white',
                'bg-linear-to-r from-violet-600 to-fuchsia-600',
                'shadow-sm transition-all hover:brightness-110 active:scale-[0.97]'
              )}
            >
              Retry
            </button>
          </div>
        ) : hint ? (
          <p className="text-sm leading-snug text-muted-foreground">{hint}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No extra hint available for this clue.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CluePanel({ game, moreHints, className }: CluePanelProps) {
  const entries = useAtomValue(numbered_entries_atom);
  const focus = useAtomValue(active_focus_atom);
  const solvedIds = useAtomValue(solved_entry_ids_atom);
  const [filter, setFilter] = useState<ClueFilter>('all');
  const listRef = useRef<HTMLUListElement>(null);
  const suppressScrollRef = useRef(false);
  const prevSolvedIdsRef = useRef<string[]>(solvedIds);

  const displayFilter = useMemo((): ClueFilter => {
    if (!focus || filter === 'all') return filter;
    const entry = entries.find((e) => e.id === focus.entryId);
    if (!entry || solvedIds.includes(entry.id)) return filter;
    if (filter === 'across' && entry.direction === 'down') return 'down';
    if (filter === 'down' && entry.direction === 'across') return 'across';
    return filter;
  }, [filter, focus, entries, solvedIds]);

  const filtered =
    displayFilter === 'all'
      ? entries
      : entries.filter((entry) => entry.direction === displayFilter);
  const sorted = sortClues(filtered, solvedIds);

  const onFocusedEntrySolved = useEffectEvent(() => {
    suppressScrollRef.current = true;
    game.clearFocus();
    // Keep suppress active through the layout animation so we don't chase the row.
    window.setTimeout(() => {
      suppressScrollRef.current = false;
    }, 450);
  });

  // When the focused word becomes solved: clear selection and don't follow-scroll.
  useEffect(() => {
    const prev = prevSolvedIdsRef.current;
    const newlySolved = solvedIds.filter((id) => !prev.includes(id));
    prevSolvedIdsRef.current = solvedIds;

    const focusedId = focus?.entryId;
    if (!focusedId || newlySolved.length === 0) return;
    if (!newlySolved.includes(focusedId)) return;

    onFocusedEntrySolved();
  }, [solvedIds, focus?.entryId]);

  // Scroll the focused (unsolved) clue into view within the list scroller.
  useEffect(() => {
    if (!focus) return;
    if (suppressScrollRef.current) return;
    if (solvedIds.includes(focus.entryId)) return;

    const entry = entries.find((e) => e.id === focus.entryId);
    if (!entry) return;

    // Wait a frame so filter switches can paint the row first.
    const frame = requestAnimationFrame(() => {
      if (suppressScrollRef.current) return;
      const list = listRef.current;
      if (!list) return;
      const row = list.querySelector<HTMLElement>(`[data-entry-id="${focus.entryId}"]`);
      if (!row) return;
      row.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });

    return () => cancelAnimationFrame(frame);
  }, [focus, displayFilter, entries, solvedIds]);

  return (
    <div
      className={cn(
        'flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border/50',
        'bg-linear-to-b from-card/80 via-card/65 to-card/50 shadow-[0_4px_20px_oklch(0_0_0/0.04)] backdrop-blur-md',
        'dark:border-slate-600/40 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/50',
        'dark:shadow-[0_10px_35px_oklch(0_0_0/0.25)]',
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5 px-2.5 pt-2.5 pb-1.5">
        {FILTERS.map(({ id, label }) => {
          const isActiveFilter = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={isActiveFilter}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide uppercase shadow-sm backdrop-blur-sm transition-all outline-none focus:outline-none focus-visible:outline-none',
                isActiveFilter
                  ? 'border-blue-400/60 bg-linear-to-br from-blue-500/90 to-indigo-600/90 text-white shadow-md dark:border-blue-400/50 dark:from-blue-500/80 dark:to-indigo-600/80'
                  : 'border-slate-300/80 bg-linear-to-br from-white/90 to-slate-100/80 text-slate-600 hover:from-white hover:to-slate-50 hover:shadow-md dark:border-slate-500/50 dark:from-slate-700/80 dark:to-slate-800/70 dark:text-slate-200 dark:hover:from-slate-600/80 dark:hover:to-slate-700/70'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <LayoutGroup>
        <ul
          ref={listRef}
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-2"
          role="list"
          aria-label="Crossword clues"
        >
          {sorted.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">No clues</li>
          ) : (
            sorted.map((entry) => {
              const solved = solvedIds.includes(entry.id);
              const active = focus?.entryId === entry.id && !solved;

              return (
                <motion.li
                  key={entry.id}
                  layout
                  data-entry-id={entry.id}
                  initial={false}
                  animate={{
                    opacity: solved ? 0.72 : 1,
                    scale: 1
                  }}
                  transition={{
                    layout: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 },
                    opacity: { duration: 0.25 }
                  }}
                  className={cn(
                    'flex items-start gap-1 rounded-xl',
                    active &&
                      'border-l-[3px] border-blue-400 bg-linear-to-r from-blue-500/15 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/10'
                  )}
                >
                  <motion.button
                    type="button"
                    disabled={!game.started || game.completed}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => {
                      game.focusCell(entry.row, entry.col, { direction: entry.direction });
                    }}
                    animate={
                      solved
                        ? { backgroundColor: 'rgba(16, 185, 129, 0.08)' }
                        : { backgroundColor: 'rgba(0, 0, 0, 0)' }
                    }
                    transition={{ duration: 0.35 }}
                    className={cn(
                      'min-w-0 flex-1 rounded-xl px-2.5 py-2 text-left text-sm leading-snug transition-colors duration-200 outline-none focus:outline-none focus-visible:outline-none',
                      'disabled:cursor-default disabled:opacity-60',
                      active && 'text-foreground dark:text-slate-50',
                      !active &&
                        !solved &&
                        'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700/40 dark:hover:text-white',
                      solved && 'text-slate-400 dark:text-slate-400'
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <span
                        className={cn(
                          'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md text-[0.7rem] font-bold',
                          active
                            ? 'bg-linear-to-br from-blue-500 to-indigo-600 text-white'
                            : solved
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-200/90 text-slate-700 dark:bg-slate-600/80 dark:text-slate-100'
                        )}
                      >
                        {entry.number}
                      </span>
                      <span className="min-w-0 flex-1 wrap-break-word">
                        <span className={cn(solved && 'line-through')}>
                          {entry.clue}
                          <AnimatePresence>
                            {solved ? (
                              <motion.span
                                key="check"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                                className="ml-1.5 inline-flex align-middle no-underline"
                              >
                                <CheckCircle2 className="size-3.5 text-emerald-500 dark:text-emerald-400" />
                              </motion.span>
                            ) : null}
                          </AnimatePresence>
                        </span>
                        {solved && entry.word_dev.trim().length > 0 ? (
                          <SolvedRomanizedWord wordDev={entry.word_dev} />
                        ) : null}
                      </span>
                    </span>
                  </motion.button>

                  {active ? (
                    <div className="shrink-0 pt-1.5 pr-1.5">
                      <MoreHintPopover entryId={entry.id} moreHints={moreHints} />
                    </div>
                  ) : null}
                </motion.li>
              );
            })
          )}
        </ul>
      </LayoutGroup>
    </div>
  );
}
