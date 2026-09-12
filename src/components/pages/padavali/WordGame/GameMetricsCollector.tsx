import { useAtom } from 'jotai';
import { useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTurnstile } from 'react-turnstile';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import { canSubmitPlayMetrics, playMetricsToken, usePlayAuth } from '~/lib/play_metrics_auth';
import {
  completed_atom,
  original_word_list_atom,
  seconds_atom,
  started_atom,
  total_attempts_atom,
  practice_mode_atom,
  game_session_nonce_atom
} from './game_state';
import type { location_list_type } from '~/db/types';
import TurnstileWidget from '~/components/Turnstile';
import { AppContext } from '~/components/AppDataContext';
import { load_posthog } from '~/components/tags/PosthogInit';

/**
 * Pre-eslint (#45) this effect intentionally omitted the mutation object from deps.
 * Exhaustive-deps added `update_games_started_mut`, which re-fired mutate on every
 * status change and caused the games_started spam. Keep mutate behind useEffectEvent
 * + a per-nonce lock so that cannot happen again.
 *
 * Complete must depend on `gamesStartedSuccess`: signed-in players have no Turnstile
 * token refresh to retry after start, and guests locally never get a token at all.
 */
const GameMetricsCollector = ({
  puzzle_id,
  location
}: {
  puzzle_id: number;
  location: location_list_type;
}) => {
  const trpc = useTRPC();
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [totalAttempts] = useAtom(total_attempts_atom);
  const [seconds] = useAtom(seconds_atom);
  const [wordList] = useAtom(original_word_list_atom);
  const [practiceMode] = useAtom(practice_mode_atom);
  const [gameSessionNonce] = useAtom(game_session_nonce_atom);
  const { script } = useContext(AppContext);
  const { authReady, isAuthed } = usePlayAuth();

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [practiceModeSyncedSessionId, setPracticeModeSyncedSessionId] = useState<number | null>(
    null
  );
  const previousGameSessionNonceRef = useRef(gameSessionNonce);
  /** Nonce for which start was already attempted — never cleared on error. */
  const startAttemptedForNonceRef = useRef<number | null>(null);
  const statsSubmittedForNonceRef = useRef<number | null>(null);
  /** One-shot per session+auth-or-token so practice sync cannot loop on error. */
  const practiceSyncAttemptKeyRef = useRef<string | null>(null);
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
    // SAFETY: the callbacks below only run after the mutation settles (async),
    // never during render — the ref is read/written from mutation lifecycle code.
    // oxlint-disable-next-line react/refs
    trpc.puzzle.stats.submit_stats.mutationOptions({
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
    // SAFETY: the callbacks below only run after the mutation settles (async),
    // never during render — the ref is read/written from mutation lifecycle code.
    // oxlint-disable-next-line react/refs
    trpc.puzzle.stats.update_games_started.mutationOptions({
      onSuccess(data, variables) {
        setPracticeModeSyncedSessionId(variables.practice_mode ? data.session_id : null);
        setTurnstileToken(null);
        resetTurnstile();
        load_posthog((posthog) => {
          posthog.capture('gameplay_started', {
            puzzle_id,
            location,
            script,
            practice_mode: variables.practice_mode
          });
        });
      },
      onError() {
        // Do NOT reset Turnstile here — a fresh token would re-enter the start effect.
        setTurnstileToken(null);
      }
    })
  );

  const {
    mutate: syncSessionPracticeMode,
    isPending: isSyncingSessionPracticeMode,
    reset: resetSessionPracticeModeSync
  } = useMutation(
    // SAFETY: the callbacks below only run after the mutation settles (async),
    // never during render — the ref is read/written from mutation lifecycle code.
    // oxlint-disable-next-line react/refs
    trpc.puzzle.stats.update_session_practice_mode.mutationOptions({
      onSuccess(_data, variables) {
        setPracticeModeSyncedSessionId(variables.session_id);
        setTurnstileToken(null);
        resetTurnstile();
      },
      onError() {
        setTurnstileToken(null);
        resetTurnstile();
      }
    })
  );

  useEffect(() => {
    if (previousGameSessionNonceRef.current === gameSessionNonce) return;
    previousGameSessionNonceRef.current = gameSessionNonce;

    startAttemptedForNonceRef.current = null;
    statsSubmittedForNonceRef.current = null;
    practiceSyncAttemptKeyRef.current = null;
    clientPlayIdRef.current = crypto.randomUUID();
    setTurnstileToken(null);
    setPracticeModeSyncedSessionId(null);
    resetGamesStarted();
    resetSubmitStats();
    resetSessionPracticeModeSync();
    resetTurnstile();
  }, [gameSessionNonce, resetGamesStarted, resetSubmitStats, resetSessionPracticeModeSync]);

  const reportGameplayStarted = useEffectEvent((token: string | null) => {
    if (startAttemptedForNonceRef.current === gameSessionNonce) return;
    if (gamesStartedSuccess || gamesStartedPending) return;

    startAttemptedForNonceRef.current = gameSessionNonce;
    mutateGamesStarted({
      turnstile_token: token,
      id: puzzle_id,
      location,
      script,
      practice_mode: practiceMode,
      client_play_id: clientPlayIdRef.current
    });
  });

  useEffect(() => {
    if (!started || completed) return;
    if (!canSubmitPlayMetrics(authReady, isAuthed, turnstileToken)) return;
    reportGameplayStarted(playMetricsToken(isAuthed, turnstileToken));
  }, [started, completed, authReady, isAuthed, turnstileToken]);

  const sessionId = gamesStartedData?.session_id;

  const reportPracticeModeSync = useEffectEvent((token: string | null) => {
    if (!sessionId || practiceModeSyncedSessionId === sessionId) return;
    if (isSyncingSessionPracticeMode) return;

    const attemptKey = isAuthed ? `auth:${sessionId}` : `guest:${sessionId}:${token}`;
    if (practiceSyncAttemptKeyRef.current === attemptKey) return;
    practiceSyncAttemptKeyRef.current = attemptKey;

    syncSessionPracticeMode({
      turnstile_token: token,
      session_id: sessionId,
      practice_mode: true
    });
  });

  useEffect(() => {
    if (!practiceMode || !sessionId || !gamesStartedSuccess) return;
    if (practiceModeSyncedSessionId === sessionId) return;
    if (!canSubmitPlayMetrics(authReady, isAuthed, turnstileToken)) return;
    reportPracticeModeSync(playMetricsToken(isAuthed, turnstileToken));
  }, [
    practiceMode,
    sessionId,
    gamesStartedSuccess,
    practiceModeSyncedSessionId,
    authReady,
    isAuthed,
    turnstileToken
  ]);

  const reportGameplayCompleted = useEffectEvent((token: string | null) => {
    if (statsSubmittedForNonceRef.current === gameSessionNonce) return;
    if (submitStatsPending || submitStatsSuccess) return;
    if (!gamesStartedSuccess || gamesStartedPending) return;
    if (!gamesStartedData?.session_id) return;

    const accuracy = Math.trunc((wordList.length / totalAttempts) * 100);
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
            correct_attempts: wordList.length,
            total_attempts: totalAttempts,
            practice_mode: practiceMode
          }
        });
        load_posthog((posthog) => {
          posthog.capture('gameplay_completed', {
            puzzle_id,
            time_taken: seconds,
            accuracy,
            correct_attempts: wordList.length,
            total_attempts: totalAttempts,
            practice_mode: practiceMode
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
    if (!completed || !gamesStartedSuccess) return;
    if (!canSubmitPlayMetrics(authReady, isAuthed, turnstileToken)) return;
    reportGameplayCompleted(playMetricsToken(isAuthed, turnstileToken));
  }, [completed, gamesStartedSuccess, authReady, isAuthed, turnstileToken]);

  if (!authReady || isAuthed) return null;
  return <TurnstileWidget setToken={setTurnstileToken} />;
};

export default GameMetricsCollector;
