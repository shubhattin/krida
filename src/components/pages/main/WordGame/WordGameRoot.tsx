'use client';

import { useRef, useEffect } from 'react';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { DEFAULT_DATA_SCRIPT, FONT_INFO, type ScriptType } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs, type word_game_msgs } from './msgs';
import { GameContoller } from './GameController';
import { GameBottom } from './BottomSection';
import { GameGrid } from './GameGrid';
import { GameHelp } from './Help';
import { createStore, Provider, useAtom } from 'jotai';
import { script_atom } from '~/state/main.state';
import { ScriptSelector } from '~/components/pages/main/ScriptSelector';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import {
  completed_atom,
  grid_data_atom,
  correct_attempts_atom,
  seconds_atom,
  started_atom,
  title_atom,
  total_attempts_atom,
  current_selection_atom,
  found_words_atom,
  word_list_atom,
  grid_dimensions_atom,
  word_msgs_atom
} from './game_state';
import { AtomsHydrator } from '~/components/AtomsHydrator';

interface WordGameProps {
  grid_data: string[][];
  dims: number[];
  word_list: string[];
  title: string;
  id: number;
  children?: React.ReactNode;
}

export default function WordGameRoot(
  props: WordGameProps & {
    script: ScriptType;
    initial_script_data: {
      word_msgs: typeof word_game_msgs;
      title: string;
      grid_data: string[][];
    };
  }
) {
  const jotaiStore = (() => {
    const store = createStore();
    store.set(script_atom, props.script);
    return store;
  })();

  return (
    <Provider store={jotaiStore} key={props.id}>
      <AtomsHydrator
        atomValues={[
          [title_atom, props.title],
          [word_list_atom, props.word_list],
          [grid_data_atom, props.grid_data],
          [grid_dimensions_atom, props.dims],
          [started_atom, false],
          [completed_atom, false],
          [current_selection_atom, []],
          [found_words_atom, []],
          [seconds_atom, 0],
          [total_attempts_atom, 0],
          [correct_attempts_atom, 0],
          [word_msgs_atom, props.initial_script_data.word_msgs]
        ]}
      >
        <WordGame {...props} />
      </AtomsHydrator>
    </Provider>
  );
}

function WordGame({ children, id: puzzle_id }: Pick<WordGameProps, 'children'> & { id: number }) {
  const [script] = useAtom(script_atom);
  const [gridData, setGridData] = useAtom(grid_data_atom);
  const [title_tr, setTitle] = useAtom(title_atom);
  const [, setWordMsgs] = useAtom(word_msgs_atom);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);

  const font_info = FONT_INFO[script as ScriptType];

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // transliteration
  useEffect(() => {
    (async () => {
      const originalGridData = gridData;
      const originalTitle = title_tr;

      setGridData(
        await Promise.all(
          originalGridData.map(
            async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script!)
          )
        )
      );
      setTitle(await lipi_parivartak(originalTitle, DEFAULT_DATA_SCRIPT, script!));

      setWordMsgs({
        ...(await get_transliterated_word_game_msgs(script!))
      });
    })();
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
          <h1
            className={cn(
              'bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text py-1 text-2xl font-bold text-transparent sm:text-3xl md:text-4xl dark:from-slate-100 dark:to-slate-300',
              font_info.className
            )}
          >
            {title_tr}
          </h1>
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
              {(started || completed) && <GameBottom />}
            </div>
          </div>

          {/* Game Grid - Center */}
          <div className="order-2 flex justify-center lg:order-2 lg:col-span-6">
            <div className="w-full max-w-lg">
              <GameGrid puzzle_id={puzzle_id} timerRef={timerRef} />
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
