'use client';

import { useSetAtom, useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';
import { IoShareSocialOutline } from 'react-icons/io5';
import { toast } from 'sonner';
import {
  celebration_fired_atom,
  completed_atom,
  incorrect_entry_attempts_atom,
  numbered_entries_atom,
  puzzle_atom,
  seconds_atom
} from './game_state';
import { formatElapsed } from '~/util/cross_word/game_model';
import { get_achievement_share_msg } from './share';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { copy_text_to_clipboard } from '~/tools/kry';

/** Classic Google brand colors for perfect-score confetti */
const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
const STANDARD_COLORS = ['#f59e0b', '#22c55e', '#38bdf8', '#a78bfa', '#f472b6'];

export function CompletionCelebration({
  listed = false,
  puzzleSlug = null
}: {
  listed?: boolean;
  puzzleSlug?: string | null;
}) {
  const completed = useAtomValue(completed_atom);
  const setFired = useSetAtom(celebration_fired_atom);
  const seconds = useAtomValue(seconds_atom);
  const puzzle = useAtomValue(puzzle_atom);
  const entries = useAtomValue(numbered_entries_atom);
  const incorrectEntryAttempts = useAtomValue(incorrect_entry_attempts_atom);
  const hasTriggeredRef = useRef(false);

  const totalEntries = entries.length;
  const denom = totalEntries + incorrectEntryAttempts;
  const accuracy = denom === 0 ? 0 : Math.trunc((totalEntries / denom) * 100);
  const isPerfect = accuracy === 100;

  useEffect(() => {
    if (!completed) {
      hasTriggeredRef.current = false;
      return;
    }
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;
    setFired(true);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const isWideScreen =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;
    let raf = 0;

    if (isPerfect) {
      const colors = GOOGLE_COLORS;

      if (isWideScreen) {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.6 },
          colors
        });

        const end = Date.now() + 3200;
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
          confetti({
            particleCount: 4,
            spread: 100,
            origin: { x: 0.5, y: 0.55 },
            colors
          });
          if (Date.now() < end) raf = requestAnimationFrame(frame);
        };
        frame();
      } else {
        confetti({
          particleCount: 200,
          spread: 100,
          startVelocity: 42,
          origin: { y: 0.6 },
          colors
        });

        const end = Date.now() + 2500;
        const frame = () => {
          confetti({
            particleCount: 10,
            spread: 110,
            startVelocity: 32,
            origin: { x: 0.5, y: 0.55 },
            colors
          });
          if (Date.now() < end) raf = requestAnimationFrame(frame);
        };
        frame();
      }
    } else {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: STANDARD_COLORS
      });

      const end = Date.now() + 2000;
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: STANDARD_COLORS
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: STANDARD_COLORS
        });
        if (Date.now() < end) raf = requestAnimationFrame(frame);
      };
      frame();
    }

    return () => cancelAnimationFrame(raf);
  }, [completed, isPerfect, setFired]);

  return (
    <AnimatePresence>
      {completed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className={cn(
            'relative w-full max-w-md overflow-hidden rounded-2xl border p-5 backdrop-blur-2xl sm:p-6',
            isPerfect
              ? 'border-yellow-300/70 bg-linear-to-br from-yellow-50 via-green-50 to-emerald-50 shadow-[0_8px_32px_oklch(0.75_0.12_95/0.25)] dark:border-yellow-700/50 dark:from-yellow-950/50 dark:via-green-950/50 dark:to-emerald-950/50 dark:shadow-[0_8px_32px_oklch(0.4_0.1_95/0.3)]'
              : 'border-emerald-500/30 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--card)_90%,transparent),color-mix(in_oklch,hsl(142_71%_45%)_8%,transparent))] shadow-[0_8px_32px_color-mix(in_oklch,var(--foreground)_20%,transparent),0_0_20px_color-mix(in_oklch,hsl(142_71%_45%)_10%,transparent)]'
          )}
        >
          {isPerfect ? (
            <motion.div
              className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-yellow-200/35 to-transparent dark:via-yellow-400/15"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
            />
          ) : null}

          <div className="relative flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.25, duration: 0.5, type: 'spring' }}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                isPerfect
                  ? 'bg-linear-to-br from-yellow-400 to-orange-400 shadow-lg shadow-yellow-400/30'
                  : 'bg-emerald-500/20'
              )}
            >
              <Sparkles className={cn('size-5', isPerfect ? 'text-white' : 'text-emerald-400')} />
            </motion.div>
            <div>
              <p className="font-semibold text-foreground">
                {isPerfect ? '⭐ Perfect Score!' : 'Puzzle Complete!'}
              </p>
              <p className="text-sm text-muted-foreground">
                Finished in {formatElapsed(seconds)} ·{' '}
                <span
                  className={cn(isPerfect && 'font-semibold text-yellow-600 dark:text-yellow-300')}
                >
                  {accuracy}% accuracy
                </span>
              </p>
            </div>
          </div>

          {isPerfect ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.35 }}
              className="relative mt-3"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100/90 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                ✨ Full Accuracy / Perfect Score
              </span>
            </motion.div>
          ) : null}

          {listed && puzzleSlug && puzzle ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="relative mt-4 flex justify-center"
            >
              <Button
                type="button"
                onClick={async () => {
                  const text = get_achievement_share_msg(
                    puzzle.title,
                    puzzle.description,
                    formatElapsed(seconds),
                    accuracy,
                    puzzleSlug
                  );
                  try {
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      await navigator.share({
                        title: `${puzzle.title} - Crossword`,
                        text
                      });
                    } else {
                      try {
                        await copy_text_to_clipboard(text);
                        toast.success('Achievement message copied to clipboard');
                      } catch (err) {
                        toast.error('Could not copy to clipboard');
                        console.log('Error copying:', err);
                      }
                    }
                  } catch (err) {
                    if ((err as Error).name !== 'AbortError') {
                      console.log('Error sharing:', err);
                    }
                  }
                }}
                className={cn(
                  'flex transform items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95',
                  isPerfect
                    ? 'bg-linear-to-r from-yellow-500 via-orange-500 to-amber-500 hover:from-yellow-600 hover:via-orange-600 hover:to-amber-600'
                    : 'bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                )}
              >
                <IoShareSocialOutline className="text-sm" />
                Share Achievement
              </Button>
            </motion.div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
