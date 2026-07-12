'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClockIcon, Loader2Icon, SparklesIcon, LayoutGridIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { client } from '~/api/client';
import { ListedPuzzlesBrowseEmbed } from '~/components/pages/padavali/ListedPuzzlesBrowseEmbed';
import type { ListedPuzzlesType } from '~/util/cache.server/cache_loaders';
import type { DisplayPuzzle } from '~/components/pages/padavali/listed_puzzle_display';

const NEXT_PUZZLE_CACHE_REFRESH_BUFFER_MS = 3_000;
const COUNTDOWN_SHOW_SECONDS_THRESHOLD_MS = 20 * 60 * 1000;
const SCHEDULE_REFRESH_RETRY_MS = 2_000;
const SCHEDULE_REFRESH_MAX_RETRIES = 3;

function getMsUntilNextPuzzle(startTime: Date, now = Date.now()) {
  return Math.max(0, startTime.getTime() - now);
}

function formatCountdownMmSs(totalMs: number) {
  const totalSeconds = Math.ceil(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatCountdownHuman(totalMs: number) {
  const totalMinutes = Math.ceil(totalMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
  }

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} min${minutes === 1 ? '' : 's'}`);

  return parts.join(' ') || 'soon';
}

function formatNextPuzzleCountdown(totalMs: number) {
  if (totalMs <= COUNTDOWN_SHOW_SECONDS_THRESHOLD_MS) {
    return formatCountdownMmSs(totalMs);
  }
  return formatCountdownHuman(totalMs);
}

function NextPuzzleCountdownDisplay({ startTime }: { startTime: Date }) {
  const [remainingMs, setRemainingMs] = useState(() => getMsUntilNextPuzzle(startTime));

  useEffect(() => {
    const tick = () => setRemainingMs(getMsUntilNextPuzzle(startTime));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startTime]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="inline-flex items-center gap-2.5 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-4 py-2 shadow-sm backdrop-blur-sm dark:border-emerald-800/50 dark:bg-emerald-950/40"
    >
      <div className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </div>
      <ClockIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="text-sm text-emerald-700 dark:text-emerald-300">
        Next puzzle in{' '}
        <span className="font-bold tabular-nums">{formatNextPuzzleCountdown(remainingMs)}</span>
      </span>
    </motion.div>
  );
}

type Props = {
  next_schedule:
    | {
        id: number;
        start_time: Date;
        puzzle: { id: number };
      }
    | undefined;
  listed_puzzles: ListedPuzzlesType;
  listed_puzzles_init_transliterated: DisplayPuzzle[];
};

export const NoScheduledPadavali = ({
  next_schedule,
  listed_puzzles,
  listed_puzzles_init_transliterated
}: Props) => {
  const router = useRouter();
  const [loadingNewPuzzle, setLoadingNewPuzzle] = useState(false);
  const refreshStartedRef = useRef(false);

  useEffect(() => {
    if (!next_schedule || refreshStartedRef.current) return;

    const startMs = next_schedule.start_time.getTime();
    const fireAt = startMs + NEXT_PUZZLE_CACHE_REFRESH_BUFFER_MS;
    const delay = fireAt - Date.now();

    const runRefresh = async () => {
      refreshStartedRef.current = true;
      setLoadingNewPuzzle(true);

      for (let attempt = 0; attempt <= SCHEDULE_REFRESH_MAX_RETRIES; attempt++) {
        try {
          const result = await client.puzzle.refresh_current_schedule.mutate();
          router.refresh();
          if (result.has_current) return;
        } catch {
          // retry on failure
        }
        if (attempt < SCHEDULE_REFRESH_MAX_RETRIES) {
          await new Promise((resolve) => window.setTimeout(resolve, SCHEDULE_REFRESH_RETRY_MS));
        }
      }
      refreshStartedRef.current = false;
      setLoadingNewPuzzle(false);
    };

    if (delay <= 0) {
      void runRefresh();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runRefresh();
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [next_schedule, router]);

  return (
    <div className="w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 pb-12 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Decorative background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
          <div className="absolute -top-10 left-1/3 h-48 w-48 rounded-full bg-indigo-400/10 blur-2xl dark:bg-indigo-500/10" />
          <div className="absolute -top-10 right-1/3 h-48 w-48 rounded-full bg-purple-400/8 blur-2xl dark:bg-purple-500/8" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-6 text-center sm:pt-14">
          {loadingNewPuzzle ? (
            /* Loading state */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                <Loader2Icon className="size-7 animate-spin text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  Loading new puzzle…
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  A fresh puzzle is almost ready!
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Small notice chip */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-5 flex justify-center"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/60 px-3 py-1 text-xs leading-none font-medium text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-400">
                  <span className="relative size-1.5 shrink-0 translate-y-[-0.5px] rounded-full bg-slate-400 dark:bg-slate-500" />
                  <span>No puzzle scheduled right now</span>
                </span>
              </motion.div>

              {/* Main CTA — icon + headline */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="mb-5 flex flex-col items-center gap-4"
              >
                <div className="relative">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                    <IoExtensionPuzzleSharp className="size-8 text-white" />
                  </div>
                  <motion.div
                    className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-400 shadow"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <SparklesIcon className="size-2.5 text-amber-900" />
                  </motion.div>
                </div>

                <div>
                  <h1 className="bg-linear-to-r from-slate-800 via-blue-700 to-indigo-600 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl dark:from-slate-100 dark:via-blue-300 dark:to-indigo-400">
                    Explore Sanskrit Puzzles
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    {next_schedule
                      ? 'While you wait for the next puzzle, explore our collection below.'
                      : 'Discover and play from our full collection of word puzzles.'}
                  </p>
                </div>
              </motion.div>

              {/* Countdown or check-back message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                {next_schedule ? (
                  <NextPuzzleCountdownDisplay startTime={next_schedule.start_time} />
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-4 py-2 text-xs text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-400">
                    <LayoutGridIcon className="size-3.5" />
                    Check back later for the next scheduled puzzle
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {!loadingNewPuzzle && (
        <ListedPuzzlesBrowseEmbed
          listed_puzzles={listed_puzzles}
          listed_puzzles_init_transliterated={listed_puzzles_init_transliterated}
        />
      )}
    </div>
  );
};
