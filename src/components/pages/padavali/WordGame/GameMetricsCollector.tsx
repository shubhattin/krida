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
  /** Prevents re-entry while the first start request is in flight / already sent. */
  const gamesStartedRequestedRef = useRef(false);
  const gamesStartedAttemptsRef = useRef(0);
  const clientPlayIdRef = useRef(crypto.randomUUID());
  const statsSubmittedRef = useRef(false);
  const turnstile = useTurnstile();
  const turnstileRef = useRef(turnstile);
  useEffect(() => {
    turnstileRef.current = turnstile;
  }, [turnstile]);
  const resetTurnstile = () => turnstileRef.current?.reset();

  const submit_stats_mut = client_q.puzzle.stats.submit_stats.useMutation({
    onSuccess() {
      setTurnstileToken(null);
      resetTurnstile();
      update_games_started_mut.reset();
      submit_stats_mut.reset();
    },
    onError() {
      statsSubmittedRef.current = false;
      setTurnstileToken(null);
      resetTurnstile();
    }
  });
  const update_games_started_mut = client_q.puzzle.stats.update_games_started.useMutation({
    onSuccess(data, variables) {
      setPracticeModeSyncedSessionId(variables.practice_mode ? data.session_id : null);
      setTurnstileToken(null);
      resetTurnstile();
      load_posthog((posthog) => {
        posthog.capture('gameplay_started', {
          puzzle_id: puzzle_id,
          location: location,
          script: script,
          practice_mode: variables.practice_mode
        });
      });
    },
    onError() {
      // At most one automatic retry after Turnstile issues a fresh token.
      if (gamesStartedAttemptsRef.current < 2) {
        gamesStartedRequestedRef.current = false;
      }
      setTurnstileToken(null);
      resetTurnstile();
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

  const {
    mutate: mutateGamesStarted,
    reset: resetGamesStarted,
    isSuccess: gamesStartedSuccess,
    isPending: gamesStartedPending,
    data: gamesStartedData
  } = update_games_started_mut;

  const {
    mutateAsync: mutateSubmitStatsAsync,
    reset: resetSubmitStats,
    isSuccess: submitStatsSuccess,
    isPending: submitStatsPending
  } = submit_stats_mut;

  useEffect(() => {
    if (previousGameSessionNonceRef.current === gameSessionNonce) return;
    previousGameSessionNonceRef.current = gameSessionNonce;

    gamesStartedRequestedRef.current = false;
    gamesStartedAttemptsRef.current = 0;
    clientPlayIdRef.current = crypto.randomUUID();
    statsSubmittedRef.current = false;
    setTurnstileToken(null);
    setPracticeModeSyncedSessionId(null);
    resetGamesStarted();
    resetSubmitStats();
    resetSessionPracticeModeSync();
    resetTurnstile();
  }, [gameSessionNonce, resetGamesStarted, resetSubmitStats, resetSessionPracticeModeSync]);

  const reportGameplayStarted = useEffectEvent(() => {
    if (gamesStartedRequestedRef.current || gamesStartedSuccess || gamesStartedPending) return;
    if (!turnstileToken || gamesStartedAttemptsRef.current >= 2) return;

    gamesStartedRequestedRef.current = true;
    gamesStartedAttemptsRef.current += 1;
    mutateGamesStarted({
      turnstile_token: turnstileToken,
      id: puzzle_id,
      location,
      script: script,
      practice_mode: practiceMode,
      client_play_id: clientPlayIdRef.current
    });
  });

  useEffect(() => {
    if (started && !completed && turnstileToken) {
      reportGameplayStarted();
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

  const reportGameplayCompleted = useEffectEvent(() => {
    if (statsSubmittedRef.current || submitStatsPending || submitStatsSuccess) return;
    if (!turnstileToken || !gamesStartedSuccess || gamesStartedPending) return;
    if (!gamesStartedData?.session_id) return;

    const accuracy = Math.trunc((wordList.length / totalAttempts) * 100);
    const session_id = gamesStartedData.session_id;

    statsSubmittedRef.current = true;
    void (async () => {
      try {
        await mutateSubmitStatsAsync({
          turnstile_token: turnstileToken,
          info: {
            puzzle_id: puzzle_id,
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
            puzzle_id: puzzle_id,
            time_taken: seconds,
            accuracy,
            correct_attempts: wordList.length,
            total_attempts: totalAttempts,
            practice_mode: practiceMode
          });
        });
      } catch {
        statsSubmittedRef.current = false;
        setTurnstileToken(null);
        resetTurnstile();
      }
    })();
  });

  useEffect(() => {
    if (completed && turnstileToken) {
      reportGameplayCompleted();
    }
  }, [completed, turnstileToken]);

  return <TurnstileWidget setToken={setTurnstileToken} />;
};

export default GameMetricsCollector;
