'use client';

import { useEffect, useRef, useState } from 'react';
import {
  GUEST_AUTH_PROMPT_EVENT,
  clearGuestAuthPrompt,
  guest_auth_prompt_trigger_schema,
  markGuestAuthPromptDismissed,
  noteGameVisit,
  requestGuestAuthPrompt,
  type GuestAuthPromptTrigger
} from '~/lib/guest_auth_prompt';

const PULSE_MS = 900;

export function useGuestAuthPrompt(isSignedIn: boolean, authReady: boolean) {
  const [manualOpen, setManualOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [trigger, setTrigger] = useState<GuestAuthPromptTrigger | null>(null);
  const signingInRef = useRef(false);
  const pulseTimerRef = useRef(0);
  const open = !isSignedIn && (manualOpen || autoOpen);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      const parsed = guest_auth_prompt_trigger_schema.safeParse(
        'detail' in event ? event.detail : null
      );
      if (!parsed.success) return;
      setTrigger(parsed.data);
      setAutoOpen(false);
      setPulsing(true);
      window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = window.setTimeout(() => {
        setPulsing(false);
        setAutoOpen(true);
      }, PULSE_MS);
    };

    window.addEventListener(GUEST_AUTH_PROMPT_EVENT, onPrompt);

    let visitTimer = 0;
    if (authReady && isSignedIn) {
      clearGuestAuthPrompt();
    } else if (authReady) {
      visitTimer = window.setTimeout(() => {
        if (noteGameVisit()) requestGuestAuthPrompt('return_visit');
      }, 0);
    }

    return () => {
      window.removeEventListener(GUEST_AUTH_PROMPT_EVENT, onPrompt);
      window.clearTimeout(visitTimer);
      window.clearTimeout(pulseTimerRef.current);
    };
  }, [authReady, isSignedIn]);

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
    if (autoOpen) {
      markGuestAuthPromptDismissed();
      setAutoOpen(false);
    }
  }

  function onSignIn() {
    signingInRef.current = true;
    setManualOpen(false);
    setAutoOpen(false);
    setPulsing(false);
  }

  return {
    open,
    pulsing,
    autoOpen,
    trigger,
    onOpenChange,
    onSignIn
  };
}
