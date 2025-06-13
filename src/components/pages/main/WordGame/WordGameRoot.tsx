'use client';

import { useRef, useEffect } from 'react';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { DEFAULT_DATA_SCRIPT, FONT_INFO, type ScriptType } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs, type word_game_msgs } from './msgs';
import { GameContoller } from './GameController';
import { GameInfo } from './GameInfo';
import { GameGrid } from './GameGrid';
import { GameHelp } from './Help';
import { createStore, Provider, useAtom } from 'jotai';
import { script_atom } from '~/state/main.state';
import { ScriptSelector } from '~/components/pages/main/ScriptSelector';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { ArchiveIcon, ArrowRightIcon, InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  completed_atom,
  grid_data_current_atom,
  correct_attempts_atom,
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
import { AtomsHydrator } from '~/components/AtomsHydrator';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';

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
  location: 'view_page' | 'main_page' | 'archive_page';
};

export default function WordGameRoot(
  props: WordGameProps & {
    script: ScriptType;
  }
) {
  const jotaiStore = (() => {
    const store = createStore();
    store.set(script_atom, props.script);
    return store;
  })();

  const { initial_script_data } = props;

  return (
    <Provider store={jotaiStore} key={props.id}>
      <AtomsHydrator
        atomValues={[
          [title_current_atom, initial_script_data.title],
          [grid_data_current_atom, initial_script_data.grid_data],
          [grid_dimensions_atom, props.dims],
          [started_atom, false],
          [completed_atom, false],
          [current_selection_atom, []],
          [found_words_atom, []],
          [seconds_atom, 0],
          [total_attempts_atom, 0],
          [correct_attempts_atom, 0],
          [word_msgs_atom, initial_script_data.word_msgs],
          [original_word_list_atom, props.word_list],
          [script_atom, props.script]
        ]}
      >
        <WordGame {...props} />
      </AtomsHydrator>
    </Provider>
  );
}

function WordGame({
  children,
  id: puzzle_id,
  title: org_title,
  grid_data: org_grid_data,
  description,
  uuid
}: WordGameProps & { id: number }) {
  const [script] = useAtom(script_atom);
  const [, setGridData] = useAtom(grid_data_current_atom);
  const [title, setTitle] = useAtom(title_current_atom);
  const [, setWordMsgs] = useAtom(word_msgs_atom);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);

  const font_info = FONT_INFO[script as ScriptType];

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      style={{
        // Prevent iOS Safari bounce and zoom during game
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: started && !completed ? 'contain' : 'auto'
      }}
    >
      {children}
      {/* Archived Games Section - Appears after game completion */}
      {completed && <ArchivedGamesPrompt />}
      <div
        className={cn('flex items-center justify-center pt-2.5 sm:pt-4 lg:pt-5', 'mb-2.5 sm:mb-4')}
      >
        <label className="space-x-2">
          <Icon className="h-7 w-7" src={LanguageIcon} />
          <ScriptSelector />
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

        {/* Main Game Container */}
        <div
          className={cn(
            'grid grid-cols-1 lg:grid-cols-12 lg:gap-8',
            'gap-3.5 sm:gap-5 md:gap-6 lg:gap-3'
          )}
        >
          {/* Game Controls & Progress - Left Sidebar on large screens, top on mobile */}
          <div
            className={cn(
              'order-1 flex items-center justify-center lg:order-1 lg:col-span-3',
              !started && 'lg:mt-12 lg:items-start'
            )}
          >
            <div
              className={cn(
                'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800',
                'px-5 py-3 lg:px-2 lg:py-6',
                'space-x-3.5 sm:space-x-5 md:space-x-5 lg:flex lg:flex-col lg:space-y-5 lg:space-x-0',
                completed && 'flex-col space-y-3',
                !started && 'px-2.5 sm:px-3 lg:px-4.5'
              )}
            >
              <GameContoller timerRef={timerRef} />
              {(started || completed) && <GameInfo />}
            </div>
          </div>

          {/* Game Grid - Center */}
          <div className="order-2 flex justify-center lg:order-2 lg:col-span-6">
            <div className="w-full max-w-lg">
              <GameGrid
                original_grid_data={org_grid_data}
                puzzle_id={puzzle_id}
                timerRef={timerRef}
                puzzle_uuid={uuid}
              />
            </div>
          </div>

          {/* Help Section - Right Sidebar on large screens, bottom on mobile */}
          <div className="order-3 lg:col-span-3 lg:ml-2 xl:ml-3.5">
            <div className="lg:sticky lg:top-6 lg:mt-12">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <GameHelp />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ArchivedGamesPrompt = () => {
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
            <p className="text-xs text-slate-600 sm:text-sm dark:text-slate-400">
              Want to play more puzzles while you wait for the next one?
            </p>
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
