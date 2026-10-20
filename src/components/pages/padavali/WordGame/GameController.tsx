import { MdReplay } from 'react-icons/md';
import { cn } from '~/lib/utils';
import { type RefObject, useContext } from 'react';
import { motion } from 'framer-motion';
import { FONT_INFO } from '~/state/script_font_data';
import { useAtom } from 'jotai';
import { completed_atom, word_msgs_atom } from './game_state';
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
  const [completed] = useAtom(completed_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const startGame = useStartPuzzleGame(timerRef);

  const font_info = FONT_INFO[script!];

  if (!completed) return null;

  return (
    <div>
      <motion.button
        onClick={() => startGame()}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'group relative overflow-hidden bg-linear-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
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
  );
};
