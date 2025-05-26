import { type word_game_msgs } from './word_game_msgs';
import { type Selection, formatTime } from './GameController';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { IoShareSocialOutline } from 'react-icons/io5';
import { GoStopwatch } from 'react-icons/go';
import { motion } from 'framer-motion';

type Props = {
  started: boolean;
  completed: boolean;
  seconds: number;
  wordMsgs: typeof word_game_msgs;
  foundWords: Selection[];
  word_list: string[];
  title: string;
  totalAttempts: number;
  correctAttempts: number;
};

export const GameBottom = ({
  completed,
  foundWords,
  seconds,
  started,
  wordMsgs,
  word_list,
  title,
  totalAttempts,
  correctAttempts
}: Props) => {
  return (
    <>
      {started && !completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="min-w-36 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-2.5 sm:rounded-2xl sm:p-5 md:p-6 lg:px-8 dark:border-slate-700 dark:from-slate-900 dark:to-blue-950"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-1 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-lg font-semibold tracking-wide text-slate-600 uppercase sm:text-xl dark:text-slate-400"
            >
              {wordMsgs.found_words}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex items-center justify-center space-x-1"
            >
              <span className="text-lg font-bold text-blue-600 sm:text-xl dark:text-blue-400">
                {foundWords.length}
              </span>
              <span className="text-sm font-bold text-slate-400 sm:text-lg dark:text-slate-600">
                /
              </span>
              <span className="text-lg font-bold text-slate-600 sm:text-xl dark:text-slate-400">
                {word_list.length}
              </span>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
              className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 sm:h-3 dark:bg-slate-700"
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(foundWords.length / word_list.length) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
              />
            </motion.div>

            {/* <p className="text-xs text-slate-500 dark:text-slate-400">
              {Math.round((foundWords.length / word_list.length) * 100)}% Complete
            </p> */}
          </motion.div>
        </motion.div>
      )}

      {completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:rounded-2xl sm:p-6 dark:border-green-800 dark:from-green-950 dark:to-emerald-950',
            completed && 'px-4 lg:px-3'
          )}
        >
          <motion.div
            className="space-y-3 text-center sm:space-y-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.6, type: 'spring' }}
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 sm:h-16 sm:w-16"
            >
              <GoStopwatch className="text-lg text-white sm:text-2xl" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <p className="mb-0.5 text-center text-base font-semibold text-green-700 sm:mb-1 sm:text-lg dark:text-green-300">
                🎉 {wordMsgs.time_taken} 🎉
              </p>
              <p className="font-mono text-2xl font-bold text-green-800 sm:text-3xl dark:text-green-200">
                {formatTime(seconds)}
              </p>
            </motion.div>

            {/* Accuracy Display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="-mt-1 flex items-center justify-center space-x-2"
            >
              <span className="text-lg">🎯</span>
              <div className="text-center">
                <p className="font-mono text-xl font-bold text-green-800 dark:text-green-200">
                  {totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0}%
                </p>
              </div>
            </motion.div>

            {/* {true && ( */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <Button
                  onClick={async () => {
                    if (navigator?.share) {
                      const accuracy =
                        totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
                      await navigator
                        .share({
                          title: `${title} - पदावलीशब्दक्रीडनम्`,
                          text: get_share_msg(title, formatTime(seconds), accuracy)
                        })
                        .catch((err) => console.log('Error sharing:', err));
                    }
                  }}
                  className="flex transform items-center space-x-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all duration-200 hover:scale-105 hover:from-green-700 hover:to-emerald-700 hover:shadow-lg active:scale-95 sm:space-x-2 sm:rounded-xl sm:px-6 sm:py-3 sm:shadow-lg sm:hover:shadow-xl"
                >
                  <IoShareSocialOutline className="text-base sm:text-lg" />
                  <span className="text-sm sm:text-base">Share Achievement</span>
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

const get_share_msg = (name: string, time_taken: string, accuracy: number) => {
  const msg = [
    `✨I just solved a Super Fun, Interactive, Sanskrit Puzzle - 'Padavali'`,
    // `'${name}' in a record of ${time_taken} secs`,
    `'${name}' in a record of ${time_taken} secs with ${accuracy}% accuracy! 🎯`,
    `💪🏽I challenge you to beat my record!`,
    `Play it NOW at https://krida.thesanskritchannel.org`,
    `Playable in Devanagari/Telugu/Kannada/Gujarati/Bengali/Odia!`,
    `नमस्ते - నమస్తే - ನಮಸ್తೇ - નમસ્તે - নমস্তে - ନମସ୍ତେ`
  ].join('\n');

  return msg;
};
