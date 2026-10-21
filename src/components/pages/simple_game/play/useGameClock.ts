'use client';

import { useEffect, useState } from 'react';

/** Whole-second play clock that ticks while `running`. */
export function useGameClock(running: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  return [seconds, setSeconds] as const;
}
