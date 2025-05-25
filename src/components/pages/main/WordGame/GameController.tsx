import { MdReplay } from 'react-icons/md';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { BrainIcon } from '~/components/icons';
import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { type word_game_msgs } from './word_game_msgs';
import { GoStopwatch } from 'react-icons/go';
import { motion } from 'framer-motion';

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
    <>
      {!started && (
        <button
          onClick={handleStart}
          className={cn(
            'group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
            'rounded-xl px-3 py-2 font-bold text-white shadow-lg hover:shadow-xl sm:rounded-2xl sm:px-8 sm:py-4',
            'transform transition-all duration-200 hover:scale-105 active:scale-95',
            'flex w-full items-center justify-center space-x-2 sm:space-x-3'
          )}
        >
          <Icon src={BrainIcon} className="text-2xl sm:text-3xl" />
          <span className="text-xl sm:text-2xl">{wordMsgs.play}</span>
        </button>
      )}

      {completed && (
        <motion.button
          onClick={handleStart}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
            'rounded-xl px-3 py-2 font-bold text-white shadow-lg hover:shadow-xl sm:rounded-2xl sm:px-8 sm:py-4',
            'transform transition-all duration-200 hover:scale-105 active:scale-95',
            'flex w-full items-center justify-center space-x-2 sm:space-x-3'
          )}
        >
          <MdReplay className="text-2xl sm:text-3xl" />
          <span className="text-xl sm:text-2xl">{wordMsgs.replay}</span>
        </motion.button>
      )}

      {started && !completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 sm:rounded-2xl sm:p-5 md:p-6 lg:p-4 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center space-x-2 sm:space-x-3"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
            >
              <GoStopwatch className="text-2xl text-blue-600 sm:text-3xl dark:text-blue-400" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mb-1 text-lg font-semibold tracking-wide text-blue-600 sm:text-xl dark:text-blue-400"
              >
                {wordMsgs.time_elapsed}
              </motion.div>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="font-mono text-xl font-bold text-blue-700 sm:text-2xl dark:text-blue-300"
              >
                {formatTime(seconds)}
              </motion.span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
