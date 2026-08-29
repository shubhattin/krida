'use client';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTurnstile } from 'react-turnstile';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
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
 * Must render inside the crossword jotai Provider.
 *
 * Pre-eslint (#45) start effect deps omitted the mutation object. Exhaustive-deps
 * added it and caused games_started spam. Mutate stays behind useEffectEvent +
 * a per-nonce lock so status changes cannot re-fire start.
 */
export default function CrossWordMetricsCollector({
  puzzle_id,
  location
}: {
  puzzle_id: number;
  location: location_list_type;
}) {
  const trpc = useTRPC();
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
  /** Nonce for which start was already attempted — never cleared on error. */
  const startAttemptedForNonceRef = useRef<number | null>(null);
  const statsSubmittedForNonceRef = useRef<number | null>(null);
  const clientPlayIdRef = useRef(crypto.randomUUID());
  const turnstile = useTurnstile();
  const turnstileRef = useRef(turnstile);

  useEffect(() => {
    turnstileRef.current = turnstile;
  }, [turnstile]);

  const resetTurnstile = () => turnstileRef.current?.reset();

  const {
    mutateAsync: mutateSubmitStatsAsync,
    reset: resetSubmitStats,
    isSuccess: submitStatsSuccess,
    isPending: submitStatsPending
  } = useMutation(
    trpc.crossword.stats.submit_stats.mutationOptions({
      onSuccess() {
        setTurnstileToken(null);
        resetTurnstile();
        resetGamesStarted();
        resetSubmitStats();
      },
      onError() {
        statsSubmittedForNonceRef.current = null;
        setTurnstileToken(null);
        resetTurnstile();
      }
    })
  );

  const {
    mutate: mutateGamesStarted,
    reset: resetGamesStarted,
    isSuccess: gamesStartedSuccess,
    isPending: gamesStartedPending,
    data: gamesStartedData
  } = useMutation(
    trpc.crossword.stats.update_games_started.mutationOptions({
      onSuccess() {
        setTurnstileToken(null);
        resetTurnstile();
        load_posthog((posthog) => {
          posthog.capture('gameplay_started', {
            puzzle_id,
            location,
            game_type: 'crossword'
          });
        });
      },
      onError() {
        // Do NOT reset Turnstile here — a fresh token would re-enter the start effect.
        setTurnstileToken(null);
      }
    })
  );

  useEffect(() => {
    if (previousGameSessionNonceRef.current === gameSessionNonce) return;
    previousGameSessionNonceRef.current = gameSessionNonce;

    startAttemptedForNonceRef.current = null;
    statsSubmittedForNonceRef.current = null;
    clientPlayIdRef.current = crypto.randomUUID();
    setTurnstileToken(null);
    resetGamesStarted();
    resetSubmitStats();
    resetTurnstile();
  }, [gameSessionNonce, resetGamesStarted, resetSubmitStats]);

  const reportGameplayStarted = useEffectEvent((token: string) => {
    if (startAttemptedForNonceRef.current === gameSessionNonce) return;
    if (gamesStartedSuccess || gamesStartedPending) return;

    startAttemptedForNonceRef.current = gameSessionNonce;
    mutateGamesStarted({
      turnstile_token: token,
      id: puzzle_id,
      location,
      client_play_id: clientPlayIdRef.current
    });
  });

  useEffect(() => {
    if (started && !completed && turnstileToken) {
      reportGameplayStarted(turnstileToken);
    }
  }, [started, turnstileToken, completed]);

  const reportGameplayCompleted = useEffectEvent((token: string) => {
    if (statsSubmittedForNonceRef.current === gameSessionNonce) return;
    if (submitStatsPending || submitStatsSuccess) return;
    if (!gamesStartedSuccess || gamesStartedPending) return;
    if (!gamesStartedData?.session_id || !puzzle) return;

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
    const session_id = gamesStartedData.session_id;

    statsSubmittedForNonceRef.current = gameSessionNonce;
    void (async () => {
      try {
        await mutateSubmitStatsAsync({
          turnstile_token: token,
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
        statsSubmittedForNonceRef.current = null;
        setTurnstileToken(null);
        resetTurnstile();
      }
    })();
  });

  useEffect(() => {
    if (completed && turnstileToken) {
      reportGameplayCompleted(turnstileToken);
    }
  }, [completed, turnstileToken]);

  return <TurnstileWidget setToken={setTurnstileToken} />;
}
