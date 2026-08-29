import { MdReplay } from 'react-icons/md';
import { cn } from '~/lib/utils';
import { type RefObject, useContext } from 'react';
import { GoStopwatch } from 'react-icons/go';
import { motion } from 'framer-motion';
import { FONT_INFO } from '~/state/script_font_data';
import { useAtom } from 'jotai';
import { started_atom, completed_atom, seconds_atom, word_msgs_atom } from './game_state';
import { AppContext } from '~/components/AppDataContext';
import { useStartPuzzleGame } from './useStartPuzzleGame';
import playStyles from './play-button.module.css';

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
  const { script } = useContext(AppContext);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [seconds] = useAtom(seconds_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const startGame = useStartPuzzleGame(timerRef);

  const font_info = FONT_INFO[script!];

  return (
    <>
      {completed && (
        <div>
          <motion.button
            onClick={() => startGame()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'bg-linear-to-r group relative overflow-hidden from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
              'rounded-xl px-4 py-2.5 font-bold text-white shadow-lg hover:shadow-xl sm:rounded-2xl sm:px-6 sm:py-3',
              'transform transition-all duration-200 hover:scale-105 active:scale-95',
              'flex h-full min-h-16 w-full items-center justify-center gap-2 sm:min-h-20',
              font_info.className,
              playStyles.playButton
            )}
          >
            <span className={playStyles.playButtonShine} aria-hidden />
            <MdReplay className="relative text-xl sm:text-2xl" />
            <span className="relative text-lg sm:text-xl">{wordMsgs.replay}</span>
          </motion.button>
        </div>
      )}

      {started && !completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="bg-linear-to-r rounded-xl border border-blue-200 from-blue-50 to-indigo-50 p-2.5 sm:rounded-2xl sm:p-5 md:p-6 lg:p-4 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950"
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
