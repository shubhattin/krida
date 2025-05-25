import { MdReplay } from 'react-icons/md';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { BrainIcon } from '~/components/icons';
import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { type word_game_msgs } from './word_game_msgs';
import { GoStopwatch } from 'react-icons/go';

export type CellPosition = { row: number; col: number };
export type Selection = { cells: CellPosition[]; word: string };

type Props = {
  started: boolean;
  completed: boolean;
  seconds: number;
  timerRef: RefObject<NodeJS.Timeout | null>;
  setStarted: Dispatch<SetStateAction<boolean>>;
  setCompleted: Dispatch<SetStateAction<boolean>>;
  setSeconds: Dispatch<SetStateAction<number>>;
  setFoundWords: Dispatch<SetStateAction<Selection[]>>;
  wordMsgs: typeof word_game_msgs;
};

// Format seconds to mm:ss
export const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const GameContoller = ({
  started,
  completed,
  seconds,
  timerRef,
  setCompleted,
  setSeconds,
  setStarted,
  setFoundWords,
  wordMsgs
}: Props) => {
  // Start the game
  const handleStart = () => {
    setStarted(true);
    setSeconds(0);
    setFoundWords([]);
    setCompleted(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Timer effect
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-200">
          Game Control
        </h2>

        {!started && (
          <button
            onClick={handleStart}
            className={cn(
              'group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
              'rounded-2xl px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl',
              'transform transition-all duration-200 hover:scale-105 active:scale-95',
              'flex w-full items-center justify-center space-x-3'
            )}
          >
            <Icon src={BrainIcon} className="text-2xl" />
            <span className="text-xl">{wordMsgs.play}</span>
          </button>
        )}

        {completed && (
          <button
            onClick={handleStart}
            className={cn(
              'group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
              'rounded-2xl px-8 py-4 font-bold text-white shadow-lg hover:shadow-xl',
              'transform transition-all duration-200 hover:scale-105 active:scale-95',
              'flex w-full items-center justify-center space-x-3'
            )}
          >
            <MdReplay className="text-2xl" />
            <span className="text-xl">{wordMsgs.replay}</span>
          </button>
        )}

        {started && !completed && (
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
            <div className="flex items-center justify-center space-x-3">
              <GoStopwatch className="text-3xl text-blue-600 dark:text-blue-400" />
              <div className="text-center">
                <p className="mb-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                  Time Elapsed
                </p>
                <span className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatTime(seconds)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
