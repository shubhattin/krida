'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  GUEST_AUTH_PROMPT_EVENT,
  canOfferGuestAuthSnooze,
  clearGuestAuthPrompt,
  guest_auth_prompt_event_schema,
  markGuestAuthPromptDismissed,
  noteGameVisit,
  onGuestGameStart,
  readGuestAuthPromptState,
  readGuestCompletedCount,
  requestGuestAuthPrompt,
  snoozeGuestAuthPrompt,
  subscribeGuestAuthState,
  type GuestAuthPromptTrigger
} from '~/lib/guest_auth_prompt';
import { captureAuthPromptEvent, consumePendingSignIn } from '~/lib/google_sign_in';
import { cancelOneTap, isOneTapAvailable, promptOneTap } from '~/lib/one_tap';
import { installGuestAuthPromptDebug } from '~/lib/guest_auth_prompt_debug';

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
    let active = true;
    const later = (fn: () => void, delay: number) => {
      timers.push(window.setTimeout(fn, delay));
    };
    const captureShown = (nextTrigger: GuestAuthPromptTrigger, surface: string) =>
      captureAuthPromptEvent('auth_prompt_shown', {
        trigger: nextTrigger,
        surface,
        shown_count: readGuestAuthPromptState().shownCount
      });

    const openPopover = (nextTrigger: GuestAuthPromptTrigger) => {
      captureShown(nextTrigger, 'popover');
      setCanSnooze(canOfferGuestAuthSnooze());
      setAutoOpen(true);
    };

    /** Prefer native One Tap; fall back to our popover only when it could not show. */
    const autoPrompt = async (nextTrigger: GuestAuthPromptTrigger) => {
      if (!isOneTapAvailable()) return openPopover(nextTrigger);
      const outcome = await promptOneTap();
      if (import.meta.env.DEV) console.info('[auth-prompt] One Tap outcome:', outcome);
      if (!active || outcome === 'cancelled') return;
      if (outcome === 'signed_in') {
        captureShown(nextTrigger, 'one_tap');
        captureAuthPromptEvent('auth_signed_in', { surface: 'one_tap', trigger: nextTrigger });
        return;
      }
      if (outcome === 'dismissed') {
        // One closed prompt is enough — never chase it with the popover.
        captureShown(nextTrigger, 'one_tap');
        markGuestAuthPromptDismissed();
        captureAuthPromptEvent('auth_prompt_dismissed', {
          surface: 'one_tap',
          trigger: nextTrigger
        });
        return;
      }
      openPopover(nextTrigger);
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
        later(() => {
          setPulsing(false);
          if (mode === 'open') {
            void autoPrompt(nextTrigger);
          } else {
            captureShown(nextTrigger, 'chip_pulse');
          }
        }, PULSE_MS);
      }, promptDelayMs(nextTrigger));
    };

    window.addEventListener(GUEST_AUTH_PROMPT_EVENT, onPrompt);
    if (import.meta.env.DEV) installGuestAuthPromptDebug();
    const stopGameListener = onGuestGameStart(cancelOneTap);

    if (authReady && isSignedIn) {
      clearGuestAuthPrompt();
      const pending = consumePendingSignIn();
      if (pending) captureAuthPromptEvent('auth_signed_in', pending);
    } else if (authReady && noteGameVisit()) {
      later(() => requestGuestAuthPrompt('return_visit'), RETURN_VISIT_DELAY_MS);
    }

    return () => {
      active = false;
      stopGameListener();
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
      surface: 'popover',
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
