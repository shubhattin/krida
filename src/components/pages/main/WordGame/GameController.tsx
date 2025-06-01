import { MdReplay } from 'react-icons/md';
import { cn } from '~/lib/utils';
import { type RefObject, useEffect } from 'react';
import { GoStopwatch } from 'react-icons/go';
import { motion } from 'framer-motion';
import { FONT_INFO } from '~/state/script_font_data';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { useAtom } from 'jotai';
import { script_atom } from '~/state/main.state';
import {
  started_atom,
  completed_atom,
  seconds_atom,
  found_words_atom,
  word_msgs_atom
} from './game_state';

// Format seconds to mm:ss
export const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

type Props = {
  timerRef: RefObject<NodeJS.Timeout | null>;
};

export const GameContoller = ({ timerRef }: Props) => {
  const [script] = useAtom(script_atom);
  const [started, setStarted] = useAtom(started_atom);
  const [completed, setCompleted] = useAtom(completed_atom);
  const [seconds, setSeconds] = useAtom(seconds_atom);
  const [, setFoundWords] = useAtom(found_words_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);

  const font_info = FONT_INFO[script!];

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
            'rounded-xl px-3 py-2 pb-1 font-bold text-white shadow-lg hover:shadow-xl sm:rounded-2xl sm:px-5 sm:py-4 sm:pb-2',
            'transform transition-all duration-200 hover:scale-105 active:scale-95',
            'flex w-full items-center justify-center space-x-2 sm:space-x-3',
            font_info.className
          )}
        >
          <IoExtensionPuzzleSharp className="-mt-2 size-6 sm:size-7 md:size-7.5" />
          <span className="text-xl sm:text-2xl">{wordMsgs.play}</span>
        </button>
      )}

      {completed && (
        <div>
          <motion.button
            onClick={handleStart}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
              'rounded-xl px-3 py-2 font-bold text-white shadow-lg hover:shadow-xl sm:rounded-2xl sm:px-8 sm:py-4',
              'transform transition-all duration-200 hover:scale-105 active:scale-95',
              'flex w-full items-center justify-center space-x-2 sm:space-x-3',
              font_info.className
            )}
          >
            <MdReplay className="text-2xl sm:text-3xl" />
            <span className="text-xl sm:text-2xl">{wordMsgs.replay}</span>
          </motion.button>
        </div>
      )}

      {started && !completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 sm:rounded-2xl sm:p-5 md:p-6 lg:p-4 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950"
        >
          <div className="flex items-center justify-center space-x-2 sm:space-x-3">
            <div>
              <GoStopwatch className="text-2xl text-blue-600 sm:text-3xl dark:text-blue-400" />
            </div>
            <div className="text-center">
              <div
                className={cn(
                  'mb-1 text-lg font-semibold tracking-wide text-blue-600 sm:text-xl dark:text-blue-400',
                  font_info.className
                )}
              >
                {wordMsgs.time_elapsed}
              </div>
              <span className="font-mono text-xl font-bold text-blue-700 sm:text-2xl dark:text-blue-300">
                {formatTime(seconds)}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};
