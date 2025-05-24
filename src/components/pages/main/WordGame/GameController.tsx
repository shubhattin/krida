import { MdReplay } from 'react-icons/md';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { BrainIcon } from '~/components/icons';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { type word_game_msgs } from './word_game_msgs';

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

  return (
    <div className="flex w-full max-w-md items-center justify-center">
      {!started && (
        <button
          onClick={handleStart}
          className={cn(
            'group flex items-center justify-center space-x-2 rounded-xl px-2 py-0.5 pt-2 font-semibold',
            'border-2 border-red-600 hover:border-blue-700 dark:border-orange-500 hover:dark:border-pink-500'
          )}
        >
          <Icon
            src={BrainIcon}
            className="-mt-1.5 text-2xl text-green-500 group-hover:text-emerald-600 dark:text-green-400"
          />
          <span className="text-2xl text-amber-500 group-hover:text-yellow-600 dark:text-amber-300 group-hover:dark:text-yellow-400">
            {wordMsgs.play}
          </span>
        </button>
      )}
      {completed && (
        <button
          onClick={handleStart}
          className={cn(
            'flex items-center justify-center font-semibold',
            'group space-x-2 rounded-xl border-2 px-2 py-0.5'
          )}
        >
          <MdReplay className="text-2xl" />
          <span className="text-2xl text-sky-600 group-hover:text-sky-700 dark:text-sky-300 group-hover:dark:text-sky-400">
            {wordMsgs.replay}
          </span>
        </button>
      )}

      <div className="text-xl font-semibold">
        {started && !completed && (
          <span
            className={cn(
              'font-mono',
              completed ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
            )}
          >
            {formatTime(seconds)}
          </span>
        )}
      </div>
    </div>
  );
};
