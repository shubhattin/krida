'use client';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { useTurnstile } from 'react-turnstile';
import { client_q } from '~/api/client';
import type { location_list_type } from '~/db/types';
import TurnstileWidget from '~/components/Turnstile';
import { load_posthog } from '~/components/tags/PosthogInit';
import { isFixedCell } from '~/util/cross_word/game_model';
import {
  active_crossword_id_atom,
  completed_atom,
  game_session_nonce_atom,
  incorrect_entry_attempts_atom,
  letter_inputs_atom,
  numbered_entries_atom,
  puzzle_atom,
  seconds_atom,
  started_atom
} from './game_state';

/** Registers active crossword id on the default jotai store for AppBar. */
export function ActiveCrosswordRegistrar({ puzzleId }: { puzzleId: number }) {
  const setActiveCrosswordId = useSetAtom(active_crossword_id_atom);

  useEffect(() => {
    setActiveCrosswordId(puzzleId);
    return () => setActiveCrosswordId(null);
  }, [puzzleId, setActiveCrosswordId]);

  return null;
}

/**
 * Turnstile-backed session start + completion stats.
 * Must render inside the crossword jotai Provider (loop-safe like padavali GameMetricsCollector).
 */
export default function CrossWordMetricsCollector({
  puzzle_id,
  location
}: {
  puzzle_id: number;
  location: location_list_type;
}) {
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [seconds] = useAtom(seconds_atom);
  const [gameSessionNonce] = useAtom(game_session_nonce_atom);
  const letterInputs = useAtomValue(letter_inputs_atom);
  const incorrectEntryAttempts = useAtomValue(incorrect_entry_attempts_atom);
  const puzzle = useAtomValue(puzzle_atom);
  const entries = useAtomValue(numbered_entries_atom);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const previousGameSessionNonceRef = useRef(gameSessionNonce);
  const turnstile = useTurnstile();
  const turnstileRef = useRef(turnstile);

  useEffect(() => {
    turnstileRef.current = turnstile;
  }, [turnstile]);

  const resetTurnstile = () => turnstileRef.current?.reset();

  const submit_stats_mut = client_q.crossword.stats.submit_stats.useMutation({
    onSuccess() {
      setTurnstileToken(null);
      resetTurnstile();
      update_games_started_mut.reset();
      submit_stats_mut.reset();
    }
  });
  const update_games_started_mut = client_q.crossword.stats.update_games_started.useMutation({
    onSuccess() {
      setTurnstileToken(null);
      resetTurnstile();
    }
  });

  useEffect(() => {
    if (previousGameSessionNonceRef.current === gameSessionNonce) return;
    previousGameSessionNonceRef.current = gameSessionNonce;

    setTurnstileToken(null);
    update_games_started_mut.reset();
    submit_stats_mut.reset();
    resetTurnstile();
  }, [gameSessionNonce, update_games_started_mut, submit_stats_mut]);

  useEffect(() => {
    if (started && !completed && turnstileToken && !update_games_started_mut.isSuccess) {
      update_games_started_mut.mutate({
        turnstile_token: turnstileToken,
        id: puzzle_id,
        location
      });
      load_posthog((posthog) => {
        posthog.capture('gameplay_started', {
          puzzle_id,
          location,
          game_type: 'crossword'
        });
      });
    }
  }, [started, turnstileToken, completed, puzzle_id, location, update_games_started_mut]);

  useEffect(() => {
    if (
      completed &&
      turnstileToken &&
      !update_games_started_mut.isPending &&
      update_games_started_mut.isSuccess &&
      !submit_stats_mut.isPending &&
      !submit_stats_mut.isSuccess &&
      puzzle
    ) {
      const total_entries = entries.length;
      let total_cells = 0;
      let prefilled_cells = 0;
      for (const row of puzzle.grid) {
        for (const cell of row) {
          if (cell === null) continue;
          total_cells += 1;
          if (isFixedCell(cell)) prefilled_cells += 1;
        }
      }

      const denom = total_entries + incorrectEntryAttempts;
      const accuracy = denom === 0 ? 0 : Math.trunc((total_entries / denom) * 100);
      const session_id = update_games_started_mut.data.session_id;

      void (async () => {
        try {
          await submit_stats_mut.mutateAsync({
            turnstile_token: turnstileToken,
            info: {
              puzzle_id,
              session_id,
              time_taken: seconds,
              accuracy,
              total_entries,
              total_cells,
              prefilled_cells,
              letter_inputs: letterInputs,
              incorrect_entry_attempts: incorrectEntryAttempts
            }
          });
          load_posthog((posthog) => {
            posthog.capture('gameplay_completed', {
              puzzle_id,
              location,
              game_type: 'crossword',
              time_taken: seconds,
              accuracy,
              total_entries,
              total_cells,
              prefilled_cells,
              letter_inputs: letterInputs,
              incorrect_entry_attempts: incorrectEntryAttempts
            });
          });
        } catch {
          setTurnstileToken(null);
          resetTurnstile();
        }
      })();
    }
  }, [
    turnstileToken,
    update_games_started_mut,
    submit_stats_mut,
    completed,
    puzzle_id,
    location,
    seconds,
    letterInputs,
    incorrectEntryAttempts,
    puzzle,
    entries
  ]);

  return <TurnstileWidget setToken={setTurnstileToken} />;
}
