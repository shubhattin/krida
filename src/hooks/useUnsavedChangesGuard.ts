'use client';

import { useEffect, useRef } from 'react';

const DEFAULT_MESSAGE =
  'You have unsaved changes. Are you sure you want to leave? Your edits will be lost.';

const GUARD_STATE = { __padavaliEditorUnsavedGuard: true } as const;

function isGuardState(state: unknown): boolean {
  return (
    !!state &&
    typeof state === 'object' &&
    (state as { __padavaliEditorUnsavedGuard?: boolean }).__padavaliEditorUnsavedGuard === true
  );
}

/**
 * Browser-level leave guard: blocks reload/close via `beforeunload`, and
 * intercepts back/forward via `popstate` + native `confirm`.
 * Active only while `enabled` is true.
 */
export function useUnsavedChangesGuard(enabled: boolean, message: string = DEFAULT_MESSAGE) {
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    if (!enabled) return;

    let sentinelPushed = false;

    const pushSentinel = () => {
      if (sentinelPushed) return;
      window.history.pushState(GUARD_STATE, '', window.location.href);
      sentinelPushed = true;
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = () => {
      // Browser already popped our sentinel (or navigated). Treat as leave attempt.
      sentinelPushed = false;
      const confirmLeave = window.confirm(messageRef.current);
      if (!confirmLeave) {
        pushSentinel();
        return;
      }
      // Proceed with the back navigation past the real page entry.
      window.history.back();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    pushSentinel();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      // Drop the duplicate same-URL sentinel without leaving the editor.
      if (sentinelPushed && isGuardState(window.history.state)) {
        sentinelPushed = false;
        window.history.back();
      }
    };
  }, [enabled]);
}
