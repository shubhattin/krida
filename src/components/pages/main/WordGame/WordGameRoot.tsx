'use client';

import { useRef, useEffect, useMemo, useContext } from 'react';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { DEFAULT_DATA_SCRIPT, FONT_INFO, type ScriptType } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs, type word_game_msgs } from './msgs';
import { GameContoller } from './GameController';
import { GameInfo } from './GameInfo';
import { GameGrid } from './GameGrid';
import { GameHelp } from './Help';
import { createStore, Provider, useAtom } from 'jotai';
import { ScriptSelector } from '~/components/pages/main/ScriptSelector';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { ArchiveIcon, ArrowRightIcon, Calendar, InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  completed_atom,
  grid_data_current_atom,
  seconds_atom,
  started_atom,
  title_current_atom,
  total_attempts_atom,
  current_selection_atom,
  found_words_atom,
  grid_dimensions_atom,
  word_msgs_atom,
  original_word_list_atom
} from './game_state';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { FaRegStopCircle } from 'react-icons/fa';
import { AppContext } from '~/components/AppDataContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { location_list_type } from '~/db/types';
import { FiYoutube } from 'react-icons/fi';
import GameMetricsCollector from './GameMetricsCollector';

dayjs.extend(relativeTime);

export type WordGameProps = {
  grid_data: string[][];
  dims: number[];
  word_list: string[];
  title: string;
  description: string | null;
  id: number;
  uuid: string;
  children?: React.ReactNode;
  initial_script_data: {
    word_msgs: typeof word_game_msgs;
    title: string;
    grid_data: string[][];
  };
  location: location_list_type;
  discussion_url: string | null;
  onChangeCompleted?: (completed: boolean) => void;
  next_schedule?: {
    id: number;
    start_time: Date;
    puzzle: {
      id: number;
    };
  };
};

export default function WordGameRoot(
  props: WordGameProps & {
    script: ScriptType;
  }
) {
  const jotaiStore = useMemo(() => {
    const store = createStore();
    store.set(title_current_atom, props.initial_script_data.title);
    store.set(grid_data_current_atom, props.initial_script_data.grid_data);
    store.set(grid_dimensions_atom, [props.dims[0], props.dims[1]]);
    store.set(started_atom, false);
    store.set(completed_atom, false);
    store.set(current_selection_atom, []);
    store.set(found_words_atom, []);
    store.set(seconds_atom, 0);
    store.set(total_attempts_atom, 0);
    store.set(word_msgs_atom, props.initial_script_data.word_msgs);
    store.set(original_word_list_atom, props.word_list);
    return store;
  }, []);

  return (
    <Provider store={jotaiStore} key={`${props.id}-${props.location}`}>
      <WordGame {...props} />
    </Provider>
  );
}

// Compact Stop Button Component
const CompactStopButton = ({
  timerRef,
  className
}: {
  timerRef: React.RefObject<NodeJS.Timeout | null>;
  className?: string;
}) => {
  const { script } = useContext(AppContext);
  const [started] = useAtom(started_atom);
  const [completed, setCompleted] = useAtom(completed_atom);
  const [, setStarted] = useAtom(started_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const [, setFoundWords] = useAtom(found_words_atom);
  const [, setSeconds] = useAtom(seconds_atom);
  const [, setCurrentSelection] = useAtom(current_selection_atom);
  const [, setTotalAttempts] = useAtom(total_attempts_atom);

  const font_info = FONT_INFO[script!];

  const handleStop = () => {
    setStarted(false);
    setFoundWords([]);
    setCurrentSelection([]);
    setTotalAttempts(0);
    setCompleted(false);
    setSeconds(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  if (!started || completed) return null;

  return (
    <>
      {/* Stop Button for <lg screens - centered below game controls */}
      <div className="flex justify-center sm:-mb-2">
        <motion.button
          onClick={handleStop}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={cn(
            'group relative overflow-hidden bg-red-500',
            'rounded-lg px-3 py-1.5 font-medium text-white shadow-md hover:shadow-lg',
            'transform transition-all duration-200 hover:scale-105 active:scale-95',
            'flex items-center justify-center gap-2 text-base',
            font_info.className
          )}
        >
          <FaRegStopCircle className="-mt-1 size-4.5" />
          <span>{wordMsgs.stop}</span>
        </motion.button>
      </div>
    </>
  );
};

function WordGame({
  children,
  id: puzzle_id,
  title: org_title,
  grid_data: org_grid_data,
  description,
  uuid,
  onChangeCompleted,
  next_schedule,
  location,
  discussion_url
}: WordGameProps & { id: number }) {
  const { script, setScript } = useContext(AppContext);
  const [, setGridData] = useAtom(grid_data_current_atom);
  const [title, setTitle] = useAtom(title_current_atom);
  const [, setWordMsgs] = useAtom(word_msgs_atom);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);

  const font_info = FONT_INFO[script as ScriptType];

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (onChangeCompleted) {
      onChangeCompleted(completed);
    }
  }, [completed]);

  // transliteration
  useEffect(() => {
    Promise.all(
      org_grid_data.map(async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script!))
    ).then((grid_data) => {
      setGridData(grid_data);
    });

    lipi_parivartak(org_title, DEFAULT_DATA_SCRIPT, script!).then((title) => {
      setTitle(title);
    });

    get_transliterated_word_game_msgs(script!).then((word_msgs) => {
      setWordMsgs(word_msgs);
    });
  }, [script]);

  // Prevent page refresh/navigation during active game
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    if (!started || completed) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show confirmation dialog when trying to leave/refresh during active game
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers require a return value
    };

    const handlePopState = (e: PopStateEvent) => {
      // Prevent back/forward navigation during active game
      if (started && !completed) {
        const confirmLeave = window.confirm(
          'Are you sure you want to leave? Your current game progress will be lost.'
        );
        if (!confirmLeave) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to handle back button
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [started, completed]);

  return (
    <div
      className={cn(
        'min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
        'pb-1 sm:pb-3 md:pb-4 lg:pb-4.5'
      )}
      style={{
        // Prevent iOS Safari bounce and zoom during game
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: started && !completed ? 'contain' : 'auto'
      }}
    >
      {children}
      {/* Archived Games Section - Appears after game completion */}
      {completed && location !== 'archive_page' && (
        <ArchivedGamesPrompt next_schedule={next_schedule} />
      )}
      <div
        className={cn('flex items-center justify-center pt-2.5 sm:pt-4 lg:pt-5', 'mb-2.5 sm:mb-4')}
      >
        <label className="flex items-center space-x-2">
          <Icon className="size-7" src={LanguageIcon} />
          <ScriptSelector script={script} onScriptChange={setScript} />
          {font_info.experimental && (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
              Beta
            </span>
          )}
        </label>
      </div>
      <div className="container mx-auto my-2.5 max-w-7xl px-2 sm:my-3.5 sm:px-4 md:my-4 md:px-6 lg:my-5">
        {/* Header Section */}
        <div className="mb-1 space-y-1 text-center sm:mb-2 sm:space-y-1.5 md:mb-3">
          <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-400 px-5 py-1 text-white shadow-lg">
            <span className="text-sm font-semibold tracking-wide uppercase">Hint</span>
          </div>
          <div
            className={cn(
              'bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text py-1 text-2xl font-bold sm:text-3xl md:text-4xl dark:from-slate-100 dark:to-slate-300',
              font_info.className
            )}
          >
            {title}
            {description && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="ml-3 outline-none hover:brightness-75">
                    <InfoIcon className="size-3 sm:size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="z-80 overflow-hidden rounded-xl border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 shadow-xl outline-none dark:border-slate-700 dark:from-teal-950/80 dark:to-green-950/80"
                >
                  <div className="text-sm text-stone-600 dark:text-stone-200">{description}</div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
        {started && (
          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32, duration: 0.5 }}
          >
            <motion.div
              className={cn(
                'flex items-center justify-center',
                started &&
                  'space-x-3.5 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xl sm:space-x-5 sm:px-6 md:space-x-5 md:px-8 dark:border-slate-700 dark:bg-slate-800',
                completed && 'flex-col space-y-3 sm:flex-row sm:space-y-0'
              )}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.08,
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.45
              }}
            >
              <GameContoller timerRef={timerRef} />
              {(started || completed) && <GameInfo />}
            </motion.div>
            <motion.div
              className="mb-4.5 pt-3 sm:mb-5.5 sm:pt-5 md:mb-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.18,
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.4
              }}
            >
              <CompactStopButton timerRef={timerRef} />
            </motion.div>
          </motion.div>
        )}

        {/* Main Game Container */}
        <div
          className={cn(
            'grid grid-cols-1 gap-y-3.5 sm:gap-y-5 md:gap-y-6 lg:grid-cols-12 lg:gap-x-4 xl:gap-x-5'
          )}
        >
          {/* Game Controls & Progress - Left Sidebar on large screens, top on mobile */}
          <div
            className={cn(
              'order-2 lg:order-1 lg:col-span-3',
              !started && 'lg:mt-10 lg:items-start'
            )}
          >
            <DiscussionUrl
              youtube_url={discussion_url ?? 'https://www.youtube.com/live/YeC5P0-vxOQ'}
            />
          </div>

          {/* Game Grid - Center */}
          <div className="order-1 flex flex-col items-center justify-center lg:order-2 lg:col-span-6">
            {/* Stop Button for <lg screens */}

            <div className="w-full max-w-lg">
              <GameGrid
                original_grid_data={org_grid_data}
                puzzle_id={puzzle_id}
                timerRef={timerRef}
                puzzle_uuid={uuid}
                location={location}
              />
            </div>
          </div>

          {/* Help Section - Right Sidebar on large screens, bottom on mobile */}
          <div className="order-3 lg:col-span-3 lg:ml-0 xl:ml-0 2xl:ml-0">
            <div className="lg:sticky lg:top-6 lg:mt-12">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <GameHelp />
              </div>
            </div>
          </div>
        </div>
      </div>
      <GameMetricsCollector puzzle_id={puzzle_id} location={location} />
    </div>
  );
}

export const ArchivedGamesPrompt = ({
  next_schedule
}: {
  next_schedule: WordGameProps['next_schedule'];
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mb-3 flex justify-center px-4 sm:mb-4"
    >
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:rounded-2xl sm:p-4 sm:shadow-xl md:p-6 dark:border-slate-700 dark:bg-slate-800"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mb-3 text-center sm:mb-4"
          >
            {next_schedule && (
              <div className="flex items-center justify-center text-base font-semibold text-slate-600 dark:text-slate-400">
                Next puzzle in
                <span className="ml-1 bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text font-bold text-transparent dark:from-emerald-400 dark:to-green-300">
                  {dayjs(next_schedule.start_time)
                    .fromNow(true)
                    .replace(
                      /\b(day|days|week|weeks|month|months|year|years)\b/gi,
                      (word) => word.charAt(0).toUpperCase() + word.slice(1)
                    )}
                </span>
                <NextPuzzleTimePopup
                  next_puzzle_start_time={next_schedule.start_time}
                  className="ml-2 text-blue-500 dark:text-sky-200"
                />
              </div>
            )}
            <div className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">
              Want to play more puzzles while you wait for the next one?
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Link
              href="/padavali/archived"
              className="group flex items-center gap-2 rounded-lg border border-amber-200/50 bg-gradient-to-r from-amber-50 to-orange-50 p-3 text-amber-800 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:from-amber-100 hover:to-orange-100 hover:shadow-md sm:gap-3 sm:rounded-xl sm:p-4 dark:border-amber-800/30 dark:from-amber-950/50 dark:to-orange-950/50 dark:text-amber-200 dark:hover:from-amber-900/60 dark:hover:to-orange-900/60"
            >
              <motion.div
                whileHover={{ rotate: 5 }}
                transition={{ duration: 0.2 }}
                className="rounded-md bg-gradient-to-r from-amber-500 to-orange-500 p-1.5 shadow-sm sm:rounded-lg sm:p-2"
              >
                <ArchiveIcon className="h-3 w-3 text-white sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </motion.div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold text-amber-900 sm:text-base dark:text-amber-100">
                  Play Archived Puzzles
                </div>
                <div className="text-xs text-amber-700 sm:text-sm dark:text-amber-300">
                  Explore our collection of past puzzles
                </div>
              </div>
              <ArrowRightIcon className="h-3 w-3 text-amber-600 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4 dark:text-amber-400" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export const NextPuzzleTimePopup = ({
  next_puzzle_start_time,
  className
}: {
  next_puzzle_start_time: Date;
  className?: string;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn('outline-none hover:brightness-75', className)}>
          <InfoIcon className="-mt-1 size-3 sm:size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="z-100 flex items-center gap-2 overflow-hidden rounded-xl border border-amber-200/50 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 shadow-xl outline-none dark:border-slate-700 dark:from-teal-950/80 dark:to-green-950/80"
      >
        <Calendar className="-mt-1 size-4" />
        <span className="bg-gradient-to-r from-amber-700 to-orange-500 bg-clip-text text-xs font-bold text-transparent brightness-95 dark:bg-gradient-to-r dark:from-amber-300 dark:to-orange-300">
          {next_puzzle_start_time.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long'
          })}
          ,{' '}
          {next_puzzle_start_time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </span>
      </PopoverContent>
    </Popover>
  );
};

// Extract video ID from YouTube URL (including live videos)
const getYouTubeVideoId = (url: string): string | null => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|live\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const DiscussionUrl = ({
  youtube_url,
  className
}: {
  youtube_url: string | null;
  className?: string;
}) => {
  if (!youtube_url) return null;

  const videoId = getYouTubeVideoId(youtube_url);

  if (!videoId) return null;
  const PROD = process.env.NODE_ENV === 'production';

  return (
    <div
      className={cn(
        'w-full space-y-1.5 p-1 sm:space-y-2',
        'flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="text=start flex items-start justify-center gap-2">
        <FiYoutube className="-mt-1 size-7 text-red-600 dark:text-red-400" />
        <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 bg-clip-text text-center text-base font-extrabold text-transparent drop-shadow-sm dark:from-amber-300 dark:via-orange-300 dark:to-yellow-200">
          Solve Together & Discuss the Puzzle
        </span>
      </div>
      {PROD ? (
        <div className="w-full max-w-md overflow-hidden rounded-lg shadow-lg">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Discussion Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full border-0"
          />
        </div>
      ) : null}
    </div>
  );
};
