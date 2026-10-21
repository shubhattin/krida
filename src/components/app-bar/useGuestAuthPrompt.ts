'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  GUEST_AUTH_PROMPT_EVENT,
  canOfferGuestAuthSnooze,
  clearGuestAuthPrompt,
  guest_auth_prompt_event_schema,
  markGuestAuthPromptDismissed,
  noteGameVisit,
  readGuestAuthPromptState,
  readGuestCompletedCount,
  requestGuestAuthPrompt,
  snoozeGuestAuthPrompt,
  subscribeGuestAuthState,
  type GuestAuthPromptTrigger
} from '~/lib/guest_auth_prompt';
import { captureAuthPromptEvent, consumePendingSignIn } from '~/lib/google_sign_in';

const PULSE_MS = 900;
/** Let the completion card and confetti land before nudging. */
const COMPLETION_DELAY_MS = 1200;
/** Give a returning guest a moment to orient before the popover appears. */
const RETURN_VISIT_DELAY_MS = 2500;

function promptDelayMs(trigger: GuestAuthPromptTrigger): number {
  if (trigger === 'return_visit') return 0;
  if (trigger === 'play_start') return 0;
  return COMPLETION_DELAY_MS;
}

/** Guest puzzles finished on this device; 0 during SSR. */
export function useGuestCompletedCount(): number {
  return useSyncExternalStore(subscribeGuestAuthState, readGuestCompletedCount, () => 0);
}

export function useGuestAuthPrompt(isSignedIn: boolean, authReady: boolean) {
  const [manualOpen, setManualOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [trigger, setTrigger] = useState<GuestAuthPromptTrigger | null>(null);
  const [canSnooze, setCanSnooze] = useState(false);
  const signingInRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const open = manualOpen || (!isSignedIn && autoOpen);

  useEffect(() => {
    const timers = timersRef.current;
    const later = (fn: () => void, delay: number) => {
      timers.push(window.setTimeout(fn, delay));
    };

    const onPrompt = (event: Event) => {
      const parsed = guest_auth_prompt_event_schema.safeParse(
        'detail' in event ? event.detail : null
      );
      if (!parsed.success) return;
      const { trigger: nextTrigger, mode } = parsed.data;
      later(() => {
        setTrigger(nextTrigger);
        setAutoOpen(false);
        setPulsing(true);
        captureAuthPromptEvent('auth_prompt_shown', {
          trigger: nextTrigger,
          mode,
          shown_count: readGuestAuthPromptState().shownCount
        });
        later(() => {
          setPulsing(false);
          if (mode !== 'open') return;
          setCanSnooze(canOfferGuestAuthSnooze());
          setAutoOpen(true);
        }, PULSE_MS);
      }, promptDelayMs(nextTrigger));
    };

    window.addEventListener(GUEST_AUTH_PROMPT_EVENT, onPrompt);

    if (authReady && isSignedIn) {
      clearGuestAuthPrompt();
      const pending = consumePendingSignIn();
      if (pending) captureAuthPromptEvent('auth_signed_in', pending);
    } else if (authReady && noteGameVisit()) {
      later(() => requestGuestAuthPrompt('return_visit'), RETURN_VISIT_DELAY_MS);
    }

    return () => {
      window.removeEventListener(GUEST_AUTH_PROMPT_EVENT, onPrompt);
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
    };
  }, [authReady, isSignedIn]);

  function closeAuto(reason: 'dismissed' | 'snoozed') {
    if (reason === 'snoozed') {
      snoozeGuestAuthPrompt();
    } else {
      markGuestAuthPromptDismissed();
    }
    captureAuthPromptEvent(reason === 'snoozed' ? 'auth_prompt_snoozed' : 'auth_prompt_dismissed', {
      trigger
    });
    setAutoOpen(false);
  }

  function onOpenChange(next: boolean) {
    if (next) {
      setManualOpen(true);
      return;
    }
    if (pulsing) return;
    setManualOpen(false);
    if (signingInRef.current) {
      signingInRef.current = false;
      setAutoOpen(false);
      return;
    }
    if (autoOpen) closeAuto('dismissed');
  }

  function onSignIn() {
    signingInRef.current = true;
    setManualOpen(false);
    setAutoOpen(false);
    setPulsing(false);
  }

  function onSnooze() {
    setManualOpen(false);
    closeAuto('snoozed');
  }

  return {
    open,
    pulsing,
    autoOpen,
    trigger,
    canSnooze: autoOpen && canSnooze,
    onOpenChange,
    onSignIn,
    onSnooze
  };
}
