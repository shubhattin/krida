'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { CrossWordGrid } from './CrossWordGrid';
import { GameProgress } from './GameProgress';
import { GameControls } from './GameControls';
import { CompletionCelebration } from './CompletionCelebration';
import { CrossWordOnScreenKeyboard } from './CrossWordOnScreenKeyboard';
import { useCrossWordGame } from './useCrossWordGame';
import { shouldAutoOpenOnScreenKeyboard } from './touch_device';
import { puzzle_atom, started_atom, completed_atom, active_entry_atom } from './game_state';
import { cn } from '~/lib/utils';
import styles from './crossword-game.module.css';

function ActiveClueCard({ activeEntry }: { activeEntry: any }) {
  return (
    <div className="w-full max-w-[24rem] px-1">
      <div className="relative flex min-h-19 w-full flex-col justify-center rounded-2xl border border-border/40 bg-card/65 p-3 shadow-[0_4px_20px_oklch(0_0_0/0.04)] backdrop-blur-md transition-all duration-200 sm:min-h-22 sm:p-4 dark:shadow-[0_10px_35px_oklch(0_0_0/0.25)]">
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
                <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-xs font-semibold tracking-wider text-transparent uppercase dark:from-violet-300 dark:to-indigo-300">
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
  const game = useCrossWordGame(timerRef);
  const puzzle = useAtomValue(puzzle_atom);
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
  const activeEntry = useAtomValue(active_entry_atom);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Close the panel when the session ends or resets; never leave it open idle.
  useEffect(() => {
    if (!started || completed) {
      setKeyboardOpen(false);
    }
  }, [started, completed]);

  const handleAfterStart = () => {
    // Auto-open only on touch-capable devices (phones, tablets, touch laptops).
    // Desktop users keep a closed panel and can reveal it via the keyboard icon.
    if (shouldAutoOpenOnScreenKeyboard()) {
      setKeyboardOpen(true);
    }
  };

  // Physical keyboard input while the game is active.
  useEffect(() => {
    if (!started) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        game.handleKeyDown(event);
        return;
      }

      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      game.handleKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game.handleKeyDown, started]);

  // Click outside to deselect grid focus — keyboard panel buttons are excluded
  // via the generic `button` check so typing never clears selection.
  useEffect(() => {
    if (!started || completed) return;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (target.closest('[role="grid"]')) return;
      if (target.closest('button')) return;
      if (target.closest('[data-crossword-onscreen-kb="true"]')) return;

      game.clearFocus();
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [game, started, completed]);

  if (!puzzle) return null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-8 sm:gap-5 sm:px-6">
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

      <div className="flex w-full flex-col items-center gap-1 sm:gap-4">
        <div
          className={cn(
            'relative w-full max-w-[min(100%,24rem)]',
            // Reserve seam space for the floating toggle when the panel is closed.
            started && !completed && !keyboardOpen && 'pb-4'
          )}
        >
          <CrossWordGrid game={game} />
          {!started ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/25 backdrop-blur-[2px]">
              <GameControls game={game} onAfterStart={handleAfterStart} />
            </div>
          ) : null}
          {/* Toggle sits on the grid/keyboard seam so it doesn't add a gap row. */}
          {started && !completed ? (
            <div className="absolute right-1 bottom-0 z-20 translate-y-1/2 sm:right-0">
              <CrossWordOnScreenKeyboard
                open={keyboardOpen}
                onOpenChange={setKeyboardOpen}
                onTypeLetter={game.typeLetter}
                onBackspace={game.backspace}
                onToggleDirection={game.toggleDirection}
                canToggleDirection={game.canToggleDirection}
                toggleOnly
              />
            </div>
          ) : null}
        </div>

        {started && !completed ? (
          <CrossWordOnScreenKeyboard
            open={keyboardOpen}
            onOpenChange={setKeyboardOpen}
            onTypeLetter={game.typeLetter}
            onBackspace={game.backspace}
            onToggleDirection={game.toggleDirection}
            canToggleDirection={game.canToggleDirection}
            panelOnly
          />
        ) : null}

        {started && !completed && <ActiveClueCard activeEntry={activeEntry} />}

        {started ? (
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <GameControls game={game} onAfterStart={handleAfterStart} />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
