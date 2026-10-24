'use client';

import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { useInvalidateUserDashboard } from '~/api/routers/user/invalidate_user_dashboard';
import {
  forgetGuestPlays,
  readGuestPlayClaims,
  readGuestPlayCount,
  subscribeGuestPlayClaims
} from '~/lib/guest_play_claims';

/** Several chips can mount at once; only one claim request runs at a time. */
let claimInFlight = false;
const MAX_CLAIM_ROUNDS = 3;

/** Finished guest plays on this device that sign-in would save; 0 during SSR. */
export function useGuestPlayCount(): number {
  return useSyncExternalStore(subscribeGuestPlayClaims, readGuestPlayCount, () => 0);
}

/**
 * Once signed in, hand this device's finished guest plays to the account. Also runs when a
 * guest submit lands after the sign-in (its token is stored a moment later).
 */
export function useClaimGuestPlays(isSignedIn: boolean, authReady: boolean) {
  const trpc = useTRPC();
  const invalidateUserDashboard = useInvalidateUserDashboard();
  const { mutateAsync } = useMutation(trpc.user.claim_guest_sessions.mutationOptions());

  const claim = useEffectEvent(async () => {
    if (claimInFlight) return;
    claimInFlight = true;
    try {
      // Re-read after each round: a play stored mid-request was skipped by the in-flight
      // guard. Bounded so storage that cannot be written never loops forever.
      for (let round = 0; round < MAX_CLAIM_ROUNDS; round++) {
        const entries = readGuestPlayClaims();
        if (entries.length === 0) break;
        const { claimed } = await mutateAsync({ tokens: entries.map((entry) => entry.token) });
        // Unclaimed tokens are expired, forged or already owned — retrying cannot help.
        forgetGuestPlays(entries.map((entry) => entry.session_id));
        if (claimed > 0) {
          invalidateUserDashboard();
          toast.success(
            claimed === 1
              ? 'Saved 1 guest puzzle to your profile'
              : `Saved ${claimed} guest puzzles to your profile`
          );
        }
      }
    } catch {
      // Network / server error — entries stay for the next attempt.
    } finally {
      claimInFlight = false;
    }
  });

  useEffect(() => {
    if (!authReady || !isSignedIn) return;
    void claim();
    return subscribeGuestPlayClaims(() => void claim());
  }, [authReady, isSignedIn]);
}
