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
import { copy_text_to_clipboard } from '~/tools/kry';

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

    const colors = ['#f59e0b', '#22c55e', '#38bdf8', '#a78bfa', '#f472b6'];
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors });

    const end = Date.now() + 2000;
    let raf = 0;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => cancelAnimationFrame(raf);
  }, [completed, setFired]);

  const totalEntries = entries.length;
  const denom = totalEntries + incorrectEntryAttempts;
  const accuracy = denom === 0 ? 0 : Math.trunc((totalEntries / denom) * 100);

  return (
    <AnimatePresence>
      {completed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--card)_90%,transparent),color-mix(in_oklch,hsl(142_71%_45%)_8%,transparent))] p-5 shadow-[0_8px_32px_color-mix(in_oklch,var(--foreground)_20%,transparent),0_0_20px_color-mix(in_oklch,hsl(142_71%_45%)_10%,transparent)] backdrop-blur-2xl sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/20">
              <Sparkles className="size-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Puzzle Complete!</p>
              <p className="text-sm text-muted-foreground">
                Finished in {formatElapsed(seconds)} · {accuracy}% accuracy
              </p>
            </div>
          </div>

          {listed && puzzleSlug && puzzle ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-4 flex justify-center"
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
                className="flex transform items-center gap-1.5 rounded-lg bg-linear-to-r from-green-600 to-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:scale-105 hover:from-green-700 hover:to-emerald-700 active:scale-95"
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
