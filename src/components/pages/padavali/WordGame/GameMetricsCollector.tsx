import { useAtom } from 'jotai';
import { useContext, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTurnstile } from 'react-turnstile';
import { client_q } from '~/api/client';
import {
  completed_atom,
  original_word_list_atom,
  seconds_atom,
  started_atom,
  total_attempts_atom,
  practice_mode_atom,
  game_session_nonce_atom
} from './game_state';
import { location_list_type } from '~/db/types';
import TurnstileWidget from '~/components/Turnstile';
import { AppContext } from '~/components/AppDataContext';
import { load_posthog } from '~/components/tags/PosthogInit';

/**
 * Pre-eslint (#45) this effect intentionally omitted the mutation object from deps.
 * Exhaustive-deps added `update_games_started_mut`, which re-fired mutate on every
 * status change and caused the games_started spam. Keep mutate behind useEffectEvent
 * + a per-nonce lock so that cannot happen again.
 */
const GameMetricsCollector = ({
  puzzle_id,
  location
}: {
  puzzle_id: number;
  location: location_list_type;
}) => {
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [totalAttempts] = useAtom(total_attempts_atom);
  const [seconds] = useAtom(seconds_atom);
  const [wordList] = useAtom(original_word_list_atom);
  const [practiceMode] = useAtom(practice_mode_atom);
  const [gameSessionNonce] = useAtom(game_session_nonce_atom);
  const { script } = useContext(AppContext);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [practiceModeSyncedSessionId, setPracticeModeSyncedSessionId] = useState<number | null>(
    null
  );
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
  } = client_q.puzzle.stats.submit_stats.useMutation({
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
  });

  const {
    mutate: mutateGamesStarted,
    reset: resetGamesStarted,
    isSuccess: gamesStartedSuccess,
    isPending: gamesStartedPending,
    data: gamesStartedData
  } = client_q.puzzle.stats.update_games_started.useMutation({
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
  });

  const {
    mutate: syncSessionPracticeMode,
    isPending: isSyncingSessionPracticeMode,
    reset: resetSessionPracticeModeSync
  } = client_q.puzzle.stats.update_session_practice_mode.useMutation({
    onSuccess(_data, variables) {
      setPracticeModeSyncedSessionId(variables.session_id);
      setTurnstileToken(null);
      resetTurnstile();
    },
    onError() {
      setTurnstileToken(null);
      resetTurnstile();
    }
  });

  useEffect(() => {
    if (previousGameSessionNonceRef.current === gameSessionNonce) return;
    previousGameSessionNonceRef.current = gameSessionNonce;

    startAttemptedForNonceRef.current = null;
    statsSubmittedForNonceRef.current = null;
    clientPlayIdRef.current = crypto.randomUUID();
    setTurnstileToken(null);
    setPracticeModeSyncedSessionId(null);
    resetGamesStarted();
    resetSubmitStats();
    resetSessionPracticeModeSync();
    resetTurnstile();
  }, [gameSessionNonce, resetGamesStarted, resetSubmitStats, resetSessionPracticeModeSync]);

  const reportGameplayStarted = useEffectEvent((token: string) => {
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
    if (started && !completed && turnstileToken) {
      reportGameplayStarted(turnstileToken);
    }
  }, [started, turnstileToken, completed]);

  const sessionId = gamesStartedData?.session_id;

  useEffect(() => {
    if (
      !practiceMode ||
      !turnstileToken ||
      !sessionId ||
      !gamesStartedSuccess ||
      practiceModeSyncedSessionId === sessionId ||
      isSyncingSessionPracticeMode
    ) {
      return;
    }

    syncSessionPracticeMode({
      turnstile_token: turnstileToken,
      session_id: sessionId,
      practice_mode: true
    });
  }, [
    practiceMode,
    turnstileToken,
    sessionId,
    gamesStartedSuccess,
    practiceModeSyncedSessionId,
    isSyncingSessionPracticeMode,
    syncSessionPracticeMode
  ]);

  const reportGameplayCompleted = useEffectEvent((token: string) => {
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
    if (completed && turnstileToken) {
      reportGameplayCompleted(turnstileToken);
    }
  }, [completed, turnstileToken]);

  return <TurnstileWidget setToken={setTurnstileToken} />;
};

export default GameMetricsCollector;
