'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';
import { celebration_fired_atom, completed_atom, seconds_atom } from './game_state';
import { formatElapsed } from '~/util/cross_word/cross_word_schema';

export function CompletionCelebration() {
  const completed = useAtomValue(completed_atom);
  const [fired, setFired] = useAtom(celebration_fired_atom);
  const seconds = useAtomValue(seconds_atom);

  useEffect(() => {
    if (!completed || fired) return;
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
  }, [completed, fired, setFired]);

  return (
    <AnimatePresence>
      {completed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="rounded-2xl border border-emerald-500/30 bg-[linear-gradient(135deg,hsl(var(--card)/0.9),hsl(142_71%_45%/0.08))] p-6 shadow-[0_8px_32px_hsl(0_0%_0%/0.2),0_0_20px_hsl(142_71%_45%/0.1)] backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/20">
              <Sparkles className="size-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Puzzle Complete!</p>
              <p className="text-sm text-muted-foreground">
                Finished in {formatElapsed(seconds)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
