'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { PADAJALA_REVEAL_COOLDOWN_PERIOD_MS } from './game_state';

type RevealWordButtonProps = {
  /** True while a reveal animation is in flight. */
  busy: boolean;
  /** Focused, unsolved entry id — null when reveal isn't available. */
  entryId: string | null;
  onReveal: (entryId: string) => void;
  className?: string;
};

/** Progress-row lifeline — reveals the next letter of the selected word. */
export function RevealWordButton({ busy, entryId, onReveal, className }: RevealWordButtonProps) {
  const canReveal = !!entryId;
  const [isCooling, setIsCooling] = useState(false);
  const cooldownTimerRef = useRef<number | null>(null);
  const blocked = busy || isCooling || !canReveal;

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current !== null) {
        window.clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const title = busy
    ? 'Revealing…'
    : isCooling
      ? 'Cooling down…'
      : !canReveal
        ? 'Select a word to reveal'
        : 'Reveal next letter';

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={!canReveal}
      aria-disabled={blocked}
      aria-busy={busy || isCooling}
      onClick={() => {
        if (!entryId || busy || isCooling) return;
        onReveal(entryId);
        setIsCooling(true);
        if (cooldownTimerRef.current !== null) {
          window.clearTimeout(cooldownTimerRef.current);
        }
        cooldownTimerRef.current = window.setTimeout(() => {
          setIsCooling(false);
          cooldownTimerRef.current = null;
        }, PADAJALA_REVEAL_COOLDOWN_PERIOD_MS);
      }}
      aria-label={title}
      title={title}
      className={cn(
        'relative h-8 gap-1 overflow-hidden rounded-full border px-2.5 font-semibold shadow-sm backdrop-blur-md',
        'bg-linear-to-r border-amber-500/30 from-orange-50/90 to-amber-50/80 text-amber-800',
        'dark:border-amber-400/35 dark:from-orange-950/70 dark:to-amber-950/60 dark:text-amber-200',
        !blocked &&
          'hover:from-orange-100 hover:to-amber-100 hover:text-amber-900 dark:hover:from-orange-900/80 dark:hover:to-amber-900/70 dark:hover:text-amber-100',
        (busy || isCooling) && 'cursor-default opacity-80',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
    >
      {isCooling ? (
        <motion.span
          key="reveal-cooldown-fill"
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-left bg-amber-500/25 dark:bg-amber-300/20"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: PADAJALA_REVEAL_COOLDOWN_PERIOD_MS / 1000,
            ease: 'linear'
          }}
        />
      ) : null}
      <Eye className="relative z-10 size-3.5 shrink-0" />
      <span className="relative z-10 text-[0.7rem] leading-none">Reveal</span>
    </Button>
  );
}
