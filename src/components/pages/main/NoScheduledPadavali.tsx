'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClockIcon, Loader2Icon } from 'lucide-react';
import { client } from '~/api/client';
import { ListedPuzzlesBrowseEmbed } from '~/components/pages/main/ListedPuzzlesBrowseEmbed';
import type { ListedPuzzlesType } from '~/util/cache.server/cache_loaders';
import type { DisplayPuzzle } from '~/components/pages/main/listed_puzzle_display';

const NEXT_PUZZLE_CACHE_REFRESH_BUFFER_MS = 4_000;
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
    <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <ClockIcon className="size-4 shrink-0" />
      <span>
        Next puzzle in{' '}
        <span className="font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
          {formatNextPuzzleCountdown(remainingMs)}
        </span>
      </span>
    </span>
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
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-12">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-slate-800 sm:text-2xl dark:text-slate-100">
            No puzzle scheduled right now
          </h1>
          <div className="text-sm text-slate-600 sm:text-base dark:text-slate-400">
            {loadingNewPuzzle ? (
              <span className="inline-flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400">
                <Loader2Icon className="size-4 animate-spin" />
                Loading new puzzle…
              </span>
            ) : next_schedule ? (
              <NextPuzzleCountdownDisplay startTime={next_schedule.start_time} />
            ) : (
              'Check back later for the next scheduled puzzle.'
            )}
          </div>
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
