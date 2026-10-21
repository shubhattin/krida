'use client';

import { useEffect, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Check, RotateCcw, Sparkles, Target, Timer, Trophy, XCircle } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { SimpleGameKind } from '~/util/games/kinds';
import { useTransliteratedText } from '../useTransliteratedText';
import { formatClock, PLAY_THEME, playGradient } from './theme';

function accuracyPercent(correct: number, attempts: number) {
  return attempts === 0 ? 100 : Math.round((correct / attempts) * 100);
}

/** End-of-game card: confetti, stat tiles, optional review, and replay. */
export function GameCompletion({
  kind,
  title,
  seconds,
  correct,
  attempts,
  scored = true,
  onRestart,
  children
}: {
  kind: SimpleGameKind;
  title: string;
  seconds: number;
  correct: number;
  attempts: number;
  /** Show accuracy / mistakes. Off for games that only judge the finished answer. */
  scored?: boolean;
  onRestart: () => void;
  children?: ReactNode;
}) {
  const accuracy = accuracyPercent(correct, attempts);
  const mistakes = Math.max(0, attempts - correct);
  const perfect = mistakes === 0;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const theme = PLAY_THEME[kind];
    const colors = [theme.from, theme.to, '#fbbf24', '#ffffff'];
    void confetti({
      particleCount: perfect ? 150 : 90,
      spread: 85,
      origin: { y: 0.65 },
      colors
    });
    if (!perfect) return;
    const timer = window.setTimeout(() => {
      void confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors
      });
      void confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [kind, perfect]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-4 shadow-lg sm:p-5"
    >
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-40 w-3/4 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ backgroundImage: playGradient(kind) }}
      />
      <div className="relative flex flex-wrap items-center gap-3">
        <motion.span
          initial={{ scale: 0, rotate: -120 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 14 }}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
          style={{ backgroundImage: playGradient(kind) }}
        >
          {perfect ? <Trophy className="size-5" /> : <Sparkles className="size-5" />}
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-tight font-black tracking-tight">{title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatPill icon={<Timer className="size-3.5" />} value={formatClock(seconds)} />
            {scored ? (
              <>
                <StatPill
                  icon={<Target className="size-3.5" />}
                  value={`${accuracy}%`}
                  highlight={perfect}
                />
                <StatPill
                  icon={<XCircle className="size-3.5" />}
                  value={`${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
                />
              </>
            ) : null}
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onRestart}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md max-sm:w-full max-sm:justify-center"
          style={{ backgroundImage: playGradient(kind) }}
        >
          <RotateCcw className="size-4" />
          Play again
        </motion.button>
      </div>
      {children ? <div className="relative mt-4">{children}</div> : null}
    </motion.div>
  );
}

function StatPill({
  icon,
  value,
  highlight = false
}: {
  icon: ReactNode;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums',
        highlight && 'border-amber-400/60 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      )}
    >
      {icon}
      {value}
    </span>
  );
}

function WordChip({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
}

/** Recap chips for word-based games (Bhramitā, Surūpa). */
export function CompletionWordList({ words }: { words: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + index * 0.05 }}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
        >
          <Check className="size-3.5" />
          <WordChip text={word} />
        </motion.span>
      ))}
    </div>
  );
}
