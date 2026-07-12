'use client';

import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { celebration_fired_atom, completed_atom } from './game_state';

/** Confetti only — no extra on-screen card. */
export function CompletionCelebration() {
  const completed = useAtomValue(completed_atom);
  const [fired, setFired] = useAtom(celebration_fired_atom);

  useEffect(() => {
    if (!completed || fired) return;
    setFired(true);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const colors = ['#f59e0b', '#22c55e', '#38bdf8', '#a78bfa'];
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });

    const end = Date.now() + 1500;
    let raf = 0;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => cancelAnimationFrame(raf);
  }, [completed, fired, setFired]);

  return null;
}
