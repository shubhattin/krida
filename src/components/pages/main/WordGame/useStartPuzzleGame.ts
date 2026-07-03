'use client';

import { type RefObject, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import {
  completed_atom,
  current_selection_atom,
  found_words_atom,
  game_session_nonce_atom,
  practice_mode_atom,
  seconds_atom,
  started_atom,
  total_attempts_atom
} from './game_state';

type StartPuzzleGameOptions = {
  resetPracticeMode?: boolean;
};

export function useStartPuzzleGame(timerRef: RefObject<NodeJS.Timeout | null>) {
  const setStarted = useSetAtom(started_atom);
  const setSeconds = useSetAtom(seconds_atom);
  const setCurrentSelection = useSetAtom(current_selection_atom);
  const setFoundWords = useSetAtom(found_words_atom);
  const setTotalAttempts = useSetAtom(total_attempts_atom);
  const setCompleted = useSetAtom(completed_atom);
  const setPracticeMode = useSetAtom(practice_mode_atom);
  const setGameSessionNonce = useSetAtom(game_session_nonce_atom);

  return useCallback(
    (options: StartPuzzleGameOptions = {}) => {
      const { resetPracticeMode = true } = options;

      setStarted(true);
      setSeconds(0);
      setCurrentSelection([]);
      setFoundWords([]);
      setTotalAttempts(0);
      setCompleted(false);
      setGameSessionNonce((prev) => prev + 1);
      if (resetPracticeMode) {
        setPracticeMode(false);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    },
    [
      timerRef,
      setStarted,
      setSeconds,
      setCurrentSelection,
      setFoundWords,
      setTotalAttempts,
      setCompleted,
      setGameSessionNonce,
      setPracticeMode
    ]
  );
}
