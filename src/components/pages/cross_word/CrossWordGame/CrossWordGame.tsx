'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { CrossWordGrid } from './CrossWordGrid';
import { CluePanel } from './CluePanel';
import { GameProgress } from './GameProgress';
import { GameControls } from './GameControls';
import { CompletionCelebration } from './CompletionCelebration';
import { AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import {
  CrossWordKeyboardBridge,
  CROSSWORD_KB_ATTR,
  type CrossWordKeyboardBridgeHandle
} from './CrossWordKeyboardBridge';
import { useCrossWordGame } from './useCrossWordGame';
import { puzzle_atom, started_atom, completed_atom, active_entry_atom } from './game_state';
import styles from './crossword-game.module.css';

function ActiveClueCard({ activeEntry }: { activeEntry: any }) {
  return (
    <div className="w-full max-w-[24rem] px-1">
      <div className="relative flex min-h-[6.5rem] w-full flex-col justify-center rounded-2xl border border-border/40 bg-card/65 p-4 shadow-[0_4px_20px_oklch(0_0_0/0.04)] backdrop-blur-md transition-all duration-200 dark:shadow-[0_10px_35px_oklch(0_0_0/0.25)]">
        <AnimatePresence mode="wait">
          {activeEntry ? (
            <motion.div
              key={activeEntry.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-[0.65rem] font-bold tracking-wider text-primary uppercase dark:bg-primary/20">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  {activeEntry.number} {activeEntry.direction}
                </span>
              </div>
              <p className="text-[0.95rem] leading-snug font-medium text-foreground/90">
                {activeEntry.clue}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center gap-1.5 py-1 text-center"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 animate-pulse text-violet-500 dark:text-violet-400" />
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-xs font-semibold tracking-wider text-transparent uppercase dark:from-violet-300 dark:to-indigo-300">
                  Ready to Solve
                </span>
              </div>
              <p className="text-[0.85rem] leading-snug font-medium text-foreground/80">
                Select a cell on the grid to reveal its clue
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CrossWordGame() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyboardRef = useRef<CrossWordKeyboardBridgeHandle>(null);
  const boardAnchorRef = useRef<HTMLDivElement>(null);
  const game = useCrossWordGame(timerRef);
  const puzzle = useAtomValue(puzzle_atom);
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
  const activeEntry = useAtomValue(active_entry_atom);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const requestKeyboard = useCallback(() => {
    if (completed) return;
    keyboardRef.current?.focus();
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv && boardAnchorRef.current) {
      const rect = boardAnchorRef.current.getBoundingClientRect();
      const visibleBottom = vv.offsetTop + vv.height;
      if (rect.bottom > visibleBottom - 12) {
        boardAnchorRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [completed]);

  // Physical keyboard when focus is NOT on the bridge (e.g. board div / page chrome)
  useEffect(() => {
    if (!started) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        game.handleKeyDown(event);
        return;
      }

      // Bridge owns its own key events — avoid double handling
      if (target.getAttribute(CROSSWORD_KB_ATTR) === 'true') return;

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      game.handleKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game.handleKeyDown, started]);

  // Keep board above keyboard when viewport shrinks
  useEffect(() => {
    if (!started || completed) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      if (document.activeElement?.getAttribute(CROSSWORD_KB_ATTR) !== 'true') return;
      boardAnchorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [started, completed]);

  // Click outside to deselect
  useEffect(() => {
    if (!started || completed) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Do not deselect if clicking inside the grid itself
      if (target.closest('[role="grid"]')) return;

      // Do not deselect if clicking on any control/action button
      if (target.closest('button')) return;

      game.clearFocus();
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [game, started, completed]);

  if (!puzzle) return null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-8 sm:px-6">
      <motion.header
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <h1
          className={`text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl ${styles.titleGradient}`}
        >
          {puzzle.title}
        </h1>
        {puzzle.description && (
          <p className="mt-1.5 text-[0.85rem] tracking-wider text-muted-foreground">
            {puzzle.description}
          </p>
        )}
      </motion.header>

      <GameProgress />
      <CompletionCelebration />

      <div className="flex w-full flex-col items-center gap-5">
        <div ref={boardAnchorRef} className="relative w-full max-w-[min(100%,24rem)]">
          <CrossWordKeyboardBridge
            ref={keyboardRef}
            onKeyDown={game.handleKeyDown}
            onTypeLetter={game.typeLetter}
            onBackspace={game.backspace}
          />
          <CrossWordGrid game={game} onRequestKeyboard={requestKeyboard} />
          {!started ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/25 backdrop-blur-[2px]">
              <GameControls game={game} onAfterStart={requestKeyboard} />
            </div>
          ) : null}
        </div>

        {started && !completed && <ActiveClueCard activeEntry={activeEntry} />}

        {started ? (
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <GameControls game={game} onAfterStart={requestKeyboard} />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
