'use client';

import { formatTime } from './GameController';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { IoShareSocialOutline } from 'react-icons/io5';
import { GoStopwatch } from 'react-icons/go';
import { motion } from 'framer-motion';
import { FONT_INFO } from '~/state/script_font_data';
import { useAtom } from 'jotai';
import {
  started_atom,
  completed_atom,
  seconds_atom,
  found_words_atom,
  title_current_atom,
  total_attempts_atom,
  word_msgs_atom,
  original_word_list_atom
} from './game_state';
import { AppContext } from '~/components/AppDataContext';
import { useContext, useEffect } from 'react';
import confetti from 'canvas-confetti';

export const GameInfo = () => {
  const { script } = useContext(AppContext);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [seconds] = useAtom(seconds_atom);
  const [foundWords] = useAtom(found_words_atom);
  const [title] = useAtom(title_current_atom);
  const [totalAttempts] = useAtom(total_attempts_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const [wordList] = useAtom(original_word_list_atom);

  const font_info = FONT_INFO[script!];
  const accuracy = totalAttempts > 0 ? Math.round((wordList.length / totalAttempts) * 100) : 0;
  const isPerfect = accuracy === 100;

  // Fire confetti on completion
  useEffect(() => {
    if (!completed) return;

    let rafId: number | null = null;

    if (isPerfect) {
      // Grand confetti for perfect score / full accuracy (3 seconds stream)
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ['#4ade80', '#22d3ee', '#a78bfa', '#fb923c', '#f472b6'];

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors
        });
        if (Date.now() < end) {
          rafId = requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
      // More intense single burst for standard completion
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c']
      });
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [completed, isPerfect]);

  return (
    <>
      {/* Active game info */}
      {started && !completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="min-w-36 rounded-xl border border-slate-200 bg-linear-to-r from-slate-50 to-blue-50 p-2.5 sm:rounded-2xl sm:p-5 md:p-6 lg:px-8 dark:border-slate-700 dark:from-slate-900 dark:to-blue-950"
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
              className={cn(
                'text-lg font-semibold tracking-wide text-slate-600 sm:text-xl dark:text-slate-400',
                font_info.className
              )}
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
                {wordList.length}
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
                animate={{ width: `${(foundWords.length / wordList.length) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-linear-to-r from-blue-500 to-emerald-500"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Completion card — compact inline card */}
      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={cn(
            'relative overflow-hidden rounded-xl border px-4 py-3 sm:rounded-2xl sm:px-5 sm:py-4',
            isPerfect
              ? 'border-yellow-300/70 bg-linear-to-br from-yellow-50 via-green-50 to-emerald-50 dark:border-yellow-700/50 dark:from-yellow-950/50 dark:via-green-950/50 dark:to-emerald-950/50'
              : 'border-green-200 bg-linear-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950 dark:to-emerald-950'
          )}
        >
          {/* Perfect score star shimmer overlay */}
          {isPerfect && (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-yellow-200/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
            />
          )}

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Timer/Celebration icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12',
                isPerfect
                  ? 'bg-linear-to-br from-yellow-400 to-orange-400 shadow-lg shadow-yellow-400/30'
                  : 'bg-linear-to-br from-green-500 to-emerald-500 shadow-md'
              )}
            >
              <GoStopwatch className="text-base text-white sm:text-xl" />
            </motion.div>

            {/* Stats & Labels Container */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {/* Completion label + time */}
                <div className="text-left">
                  <p
                    className={cn(
                      'text-xs font-semibold text-green-700 sm:text-sm dark:text-green-300',
                      font_info.className
                    )}
                  >
                    {isPerfect ? '⭐ ' : '🎉 '}
                    {wordMsgs.time_taken}
                  </p>
                  <p className="font-mono text-xl font-bold text-green-800 sm:text-2xl dark:text-green-200">
                    {formatTime(seconds)}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-green-200/60 dark:bg-green-700/40" />

                {/* Accuracy */}
                <div className="text-left">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                    Accuracy
                  </p>
                  <p
                    className={cn(
                      'font-mono text-xl font-bold sm:text-2xl',
                      isPerfect
                        ? 'text-yellow-600 dark:text-yellow-300'
                        : 'text-green-800 dark:text-green-200'
                    )}
                  >
                    🎯 {accuracy}%
                  </p>
                </div>
              </div>

              {/* Special Label Badge */}
              <div className="flex">
                {isPerfect ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100/90 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    ✨ Full Accuracy / Perfect Score
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100/90 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    👍 Completed!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Share button — below stats */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="mt-3 flex justify-center"
            >
              <Button
                onClick={async () => {
                  if (navigator?.share) {
                    await navigator
                      .share({
                        title: `${title} - पदावली-शब्द-क्रीडनम्`,
                        text: get_share_msg(title, formatTime(seconds), accuracy)
                      })
                      .catch((err) => console.log('Error sharing:', err));
                  }
                }}
                className="flex transform items-center gap-1.5 rounded-lg bg-linear-to-r from-green-600 to-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 hover:from-green-700 hover:to-emerald-700 active:scale-95"
              >
                <IoShareSocialOutline className="text-sm" />
                Share Achievement
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </>
  );
};

const get_share_msg = (name: string, time_taken: string, accuracy: number) => {
  const msg = [
    `✨I just solved a Super Fun, Interactive, Sanskrit Puzzle - 'Padavali'`,
    `'${name}' in a record of ${time_taken} secs with ${accuracy}% accuracy! 🎯`,
    `💪🏽I challenge you to beat my record!`,
    `Play it NOW at https://krida.thesanskritchannel.org/padavali`,
    `Play in your own script! Supports 8 Indian scripts!`,
    `नमस्ते - నమస్తే - ನಮಸ್ತೇ - નमस्ते - নমস্তে - ନମସ୍ତେ - നമസ്തേ - நமஸ்தே`
  ].join('\n');

  return msg;
};
