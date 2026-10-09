'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTurnstile } from 'react-turnstile';
import { useTRPC } from '~/api/client';
import { load_posthog } from '~/components/tags/PosthogInit';
import TurnstileWidget from '~/components/Turnstile';
import { canSubmitPlayMetrics, playMetricsToken, usePlayAuth } from '~/lib/play_metrics_auth';
import { requestGuestAuthPrompt } from '~/lib/guest_auth_prompt';
import type { location_list_type } from '~/db/types';
import type { SimpleGameKind } from '~/util/games/kinds';
import { useContext } from 'react';
import { AppContext } from '~/components/AppDataContext';

export function SimpleGameMetrics({
  kind,
  puzzleId,
  location,
  started,
  completed,
  seconds,
  correctAttempts,
  totalAttempts,
  sessionNonce
}: {
  kind: SimpleGameKind;
  puzzleId: number;
  location: location_list_type;
  started: boolean;
  completed: boolean;
  seconds: number;
  correctAttempts: number;
  totalAttempts: number;
  sessionNonce: number;
}) {
  const trpc = useTRPC();
  const { script } = useContext(AppContext);
  const { authReady, isAuthed } = usePlayAuth();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useTurnstile();
  const turnstileRef = useRef(turnstile);
  const clientPlayIdRef = useRef(crypto.randomUUID());
  const startAttemptedRef = useRef<number | null>(null);
  const statsSubmittedRef = useRef<number | null>(null);
  const previousNonceRef = useRef(sessionNonce);

  useEffect(() => {
    turnstileRef.current = turnstile;
  }, [turnstile]);

  const {
    mutate: mutateStarted,
    reset: resetStarted,
    isSuccess: startedOk,
    isPending: startedPending,
    data: startedData
  } = useMutation(
    trpc[kind].stats.update_games_started.mutationOptions({
      onSuccess() {
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        load_posthog((posthog) => {
          posthog.capture('gameplay_started', {
            puzzle_id: puzzleId,
            location,
            game_type: kind
          });
        });
      },
      onError() {
        setTurnstileToken(null);
      }
    })
  );

  const { mutate: mutateStats, reset: resetStats } = useMutation(
    trpc[kind].stats.submit_stats.mutationOptions({
      onSuccess() {
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        resetStarted();
        resetStats();
      },
      onError() {
        statsSubmittedRef.current = null;
        setTurnstileToken(null);
        turnstileRef.current?.reset();
      }
    })
  );

  useEffect(() => {
    if (previousNonceRef.current === sessionNonce) return;
    previousNonceRef.current = sessionNonce;
    startAttemptedRef.current = null;
    statsSubmittedRef.current = null;
    clientPlayIdRef.current = crypto.randomUUID();
    setTurnstileToken(null);
    resetStarted();
    resetStats();
    turnstileRef.current?.reset();
  }, [resetStarted, resetStats, sessionNonce]);

  const reportStart = useEffectEvent((token: string | null) => {
    if (startAttemptedRef.current === sessionNonce) return;
    if (startedOk || startedPending) return;
    startAttemptedRef.current = sessionNonce;
    mutateStarted({
      turnstile_token: token,
      id: puzzleId,
      location,
      script,
      client_play_id: clientPlayIdRef.current
    });
  });

  useEffect(() => {
    if (!started || completed) return;
    if (!canSubmitPlayMetrics(authReady, isAuthed, turnstileToken)) return;
    reportStart(playMetricsToken(isAuthed, turnstileToken));
  }, [authReady, completed, isAuthed, started, turnstileToken]);

  useEffect(() => {
    if (!authReady || isAuthed || !started || completed) return;
    requestGuestAuthPrompt('play_start');
  }, [authReady, completed, isAuthed, started]);

  const reportComplete = useEffectEvent((token: string | null) => {
    const sessionId = startedData?.session_id;
    if (!sessionId) return;
    if (statsSubmittedRef.current === sessionNonce) return;
    statsSubmittedRef.current = sessionNonce;
    const accuracy =
      totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;
    mutateStats({
      turnstile_token: token,
      info: {
        puzzle_id: puzzleId,
        time_taken: seconds,
        accuracy,
        correct_attempts: correctAttempts,
        total_attempts: totalAttempts,
        session_id: sessionId
      }
    });
  });

  useEffect(() => {
    if (!completed) return;
    if (!startedOk) return;
    if (!canSubmitPlayMetrics(authReady, isAuthed, turnstileToken)) return;
    reportComplete(playMetricsToken(isAuthed, turnstileToken));
  }, [authReady, completed, isAuthed, startedOk, turnstileToken]);

  if (isAuthed) return null;
  return (
    <div className="flex justify-center py-2">
      <TurnstileWidget setToken={setTurnstileToken} />
    </div>
  );
}
