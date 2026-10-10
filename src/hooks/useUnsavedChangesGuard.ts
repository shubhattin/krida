'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from '@tanstack/react-router';

const DEFAULT_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave? Your edits will be lost.';

/**
 * Leave guard for editors. Uses the router blocker instead of a dummy
 * `history.pushState` — that sentinel created a new history entry, and with
 * `scrollRestoration: true` the router scrolled the page back to the top on
 * the first unsaved edit.
 */
export function useUnsavedChangesGuard(enabled: boolean, message: string = DEFAULT_MESSAGE) {
  const messageRef = useRef(message);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const shouldBlockFn = useCallback(() => {
    if (!enabledRef.current) return false;
    return !window.confirm(messageRef.current);
  }, []);

  useBlocker({
    shouldBlockFn,
    disabled: !enabled,
    enableBeforeUnload: enabled,
    withResolver: false
  });
}
