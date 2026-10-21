import { authClient, GOOGLE_CLIENT_ID, refreshAuthSession } from '~/lib/auth-client';

/**
 * - `signed_in`: credential accepted, session refreshed in place (no reload).
 * - `dismissed`: the guest closed the prompt — counts toward our backoff.
 * - `not_shown`: the browser suppressed it (no Google session, cooldown, opt-out).
 * - `unavailable`: no FedCM or no client id — use the popover instead.
 * - `cancelled`: we withdrew it ourselves (a game started) — not a dismissal.
 */
export type OneTapOutcome = 'signed_in' | 'dismissed' | 'not_shown' | 'unavailable' | 'cancelled';

/**
 * FedCM drops skip reasons, so "closed by the user" and "never displayed"
 * look the same. A skip this soon after asking means nothing was shown.
 */
const NOT_SHOWN_WITHIN_MS = 1500;

/** Narrow view of Google's PromptMomentNotification that FedCM still supports. */
type PromptNotification = {
  isDismissedMoment?: () => boolean;
  getDismissedReason?: () => string;
  isSkippedMoment?: () => boolean;
};

let inFlight: Promise<OneTapOutcome> | null = null;
let cancelled = false;

declare global {
  interface Window {
    /** Google Identity Services, injected by the One Tap plugin on first prompt. */
    google?: { accounts?: { id?: { cancel: () => void } } };
  }
}

/** Withdraw a showing prompt, e.g. when the guest starts a puzzle. */
export function cancelOneTap() {
  if (!inFlight) return;
  cancelled = true;
  window.google?.accounts?.id?.cancel();
}

/** One Tap only runs where it is native and predictable: FedCM browsers. */
export function isOneTapAvailable(): boolean {
  // SAFETY: window-only check; callers are client effects. typeof is the environment check.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof window === 'undefined') return false;
  return GOOGLE_CLIENT_ID.length > 0 && 'IdentityCredential' in window;
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let gsiScript: Promise<void> | null = null;

/**
 * Load Google Identity Services up front so the not-shown timer below measures
 * only the prompt, not the download. Setting the plugin's flag makes it skip
 * its own loader.
 */
function loadGsiScript(): Promise<void> {
  if (window.googleScriptInitialized) return Promise.resolve();
  gsiScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      window.googleScriptInitialized = true;
      resolve();
    };
    script.onerror = () => {
      gsiScript = null;
      script.remove();
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return gsiScript;
}

function showPrompt(): Promise<OneTapOutcome> {
  return new Promise<OneTapOutcome>((resolve) => {
    const askedAt = performance.now();
    let settled = false;
    cancelled = false;
    const finish = (outcome: OneTapOutcome) => {
      if (settled) return;
      settled = true;
      resolve(cancelled && outcome !== 'signed_in' ? 'cancelled' : outcome);
    };

    authClient
      .oneTap({
        // fetchOptions without callbackURL → the plugin skips its full-page redirect.
        fetchOptions: {
          onSuccess: () => {
            refreshAuthSession();
            finish('signed_in');
          },
          onError: () => finish('dismissed')
        },
        onPromptNotification: (notification?: PromptNotification) => {
          if (!notification) return finish('not_shown');
          // The credential path resolves through fetchOptions above.
          if (notification.getDismissedReason?.() === 'credential_returned') return;
          // `cancel_called` (our cancelOneTap) is mapped to `cancelled` in finish().
          if (notification.isDismissedMoment?.()) return finish('dismissed');
          // FedCM errors (no Google session, unauthorised origin, embedded
          // browsers without FedCM UI) skip within a few hundred ms.
          const quick = performance.now() - askedAt < NOT_SHOWN_WITHIN_MS;
          finish(quick ? 'not_shown' : 'dismissed');
        }
      })
      // Plugin returned without a callback (already busy) — nothing showed.
      .then(() => finish('not_shown'))
      .catch(() => finish('unavailable'));
  });
}

/**
 * Show Google One Tap once and report what happened. Concurrent callers share
 * the same prompt; the plugin's own retry loop is disabled in auth-client.
 */
export function promptOneTap(): Promise<OneTapOutcome> {
  if (!isOneTapAvailable()) return Promise.resolve('unavailable');
  inFlight ??= loadGsiScript()
    .then(showPrompt, (): OneTapOutcome => 'unavailable')
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
