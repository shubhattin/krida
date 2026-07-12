'use client';

import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { CrossWordGrid } from './CrossWordGrid';
import { CluePanel } from './CluePanel';
import { GameProgress } from './GameProgress';
import { GameControls } from './GameControls';
import { CompletionCelebration } from './CompletionCelebration';
import { useCrossWordGame } from './useCrossWordGame';
import { puzzle_atom, started_atom } from './game_state';
import styles from './crossword-game.module.css';

export function CrossWordGame() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const game = useCrossWordGame(timerRef);
  const puzzle = useAtomValue(puzzle_atom);
  const started = useAtomValue(started_atom);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      game.handleKeyDown(event);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game.handleKeyDown, started]);

  if (!puzzle) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
      <motion.header
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* titleGradient stays in module: animated background-position on gradient clip */}
        <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl ${styles.titleGradient}`}>
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

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] md:items-start">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-full max-w-[min(100%,24rem)]">
            <CrossWordGrid game={game} />
            {!started ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-md">
                <GameControls game={game} />
              </div>
            ) : null}
          </div>
          {started ? (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <GameControls game={game} />
            </motion.div>
          ) : null}
        </div>

        <aside className="md:sticky md:top-6">
          <CluePanel game={game} />
        </aside>
      </div>
    </div>
  );
}
