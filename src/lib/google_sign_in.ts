import ms from 'ms';
import { z } from 'zod';
import { load_posthog } from '~/components/tags/PosthogInit';
import { toast } from 'sonner';
import { refreshAuthSession, signIn } from '~/lib/auth-client';
import {
  guest_auth_prompt_trigger_schema,
  type GuestAuthPromptTrigger
} from '~/lib/guest_auth_prompt';

/** Where the guest clicked "Continue with Google". */
export const sign_in_surface_schema = z.enum(['popover', 'inline', 'menu', 'dashboard', 'one_tap']);
export type SignInSurface = z.infer<typeof sign_in_surface_schema>;

const PENDING_SIGN_IN_KEY = 'padavali:authPrompt:pendingSignIn';
/** Ignore attribution older than this — the OAuth round trip never takes this long. */
const PENDING_SIGN_IN_TTL_MS = ms('30m');

const pending_sign_in_schema = z.object({
  surface: sign_in_surface_schema,
  trigger: guest_auth_prompt_trigger_schema.nullable(),
  at: z.number().finite()
});

export type AuthPromptEvent =
  | 'auth_prompt_shown'
  | 'auth_prompt_dismissed'
  | 'auth_prompt_snoozed'
  | 'auth_prompt_clicked'
  | 'auth_signed_in';

type AuthPromptEventProps = Record<string, string | number | boolean | null>;

export function captureAuthPromptEvent(event: AuthPromptEvent, properties: AuthPromptEventProps) {
  void load_posthog((posthog) => {
    posthog.capture(event, properties);
  });
}

function sessionStore(): Storage | null {
  try {
    // SAFETY: sessionStorage is window-only; callers are client event handlers/effects.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Same-origin channel the popup landing page reports back on. */
export const AUTH_POPUP_CHANNEL = 'padavali:auth-popup';
export const AUTH_POPUP_DONE_PATH = '/auth/popup-done';
export const auth_popup_message_schema = z.object({ type: z.enum(['signed_in', 'error']) });
/** Stop listening for a popup that was abandoned. */
const POPUP_LISTEN_MS = ms('10m');
const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 640;

function rememberPendingSignIn(surface: SignInSurface, trigger: GuestAuthPromptTrigger | null) {
  try {
    sessionStore()?.setItem(
      PENDING_SIGN_IN_KEY,
      JSON.stringify({ surface, trigger, at: Date.now() })
    );
  } catch {
    // Private mode — attribution is best-effort.
  }
}

/**
 * Open the popup synchronously inside the click so blockers allow it, and
 * paint it in the page's theme while the OAuth URL is fetched.
 */
function openSignInPopup(): Window | null {
  const left = Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2);
  const popup = window.open(
    '',
    'padavali-google-sign-in',
    `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`
  );
  if (!popup) return null;
  const dark = document.documentElement.classList.contains('dark');
  try {
    popup.document.title = 'Continue with Google';
    const body = popup.document.body;
    body.style.cssText = `margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;background:${dark ? '#0f172a' : '#f8fafc'};color:${dark ? '#94a3b8' : '#64748b'}`;
    body.textContent = 'Connecting to Google…';
  } catch {
    // Cosmetic only.
  }
  return popup;
}

/** Wait for the popup landing page to report back, then refresh in place. */
function listenForPopupResult() {
  // SAFETY: BroadcastChannel is window-only; this runs from a click handler.
  // oxlint-disable-next-line anti-slop/no-runtime-typeof
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(AUTH_POPUP_CHANNEL);
  // COOP on Google's pages can sever `popup.closed`, so focus is the fallback signal.
  const onFocus = () => refreshAuthSession();
  const stop = () => {
    channel.close();
    window.removeEventListener('focus', onFocus);
    window.clearTimeout(timer);
  };
  const timer = window.setTimeout(stop, POPUP_LISTEN_MS);
  window.addEventListener('focus', onFocus);
  channel.onmessage = (event) => {
    const parsed = auth_popup_message_schema.safeParse(event.data);
    if (!parsed.success) return;
    stop();
    if (parsed.data.type === 'signed_in') {
      refreshAuthSession();
      return;
    }
    toast.error('Google sign-in did not complete. Please try again.');
  };
}

async function redirectSignIn() {
  await signIn.social({
    provider: 'google',
    callbackURL: window.location.href
  });
}

/**
 * Start Google sign-in in a popup so the page — and any puzzle in progress —
 * stays put. Falls back to the full-page redirect when popups are blocked.
 * Remembers the surface and prompt trigger for conversion attribution.
 */
export async function startGoogleSignIn(
  surface: SignInSurface,
  trigger: GuestAuthPromptTrigger | null = null
) {
  captureAuthPromptEvent('auth_prompt_clicked', { surface, trigger });
  rememberPendingSignIn(surface, trigger);

  const popup = openSignInPopup();
  if (!popup) {
    await redirectSignIn();
    return;
  }

  const done = `${window.location.origin}${AUTH_POPUP_DONE_PATH}`;
  const { data } = await signIn.social({
    provider: 'google',
    callbackURL: done,
    errorCallbackURL: `${done}?status=error`,
    disableRedirect: true
  });
  if (!data?.url) {
    popup.close();
    await redirectSignIn();
    return;
  }
  listenForPopupResult();
  popup.location.href = data.url;
}

/** Read and clear the pending sign-in attribution, if it is still fresh. */
export function consumePendingSignIn(nowMs = Date.now()) {
  const storage = sessionStore();
  if (!storage) return null;
  try {
    const raw = storage.getItem(PENDING_SIGN_IN_KEY);
    if (!raw) return null;
    storage.removeItem(PENDING_SIGN_IN_KEY);
    const parsed = pending_sign_in_schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    if (nowMs - parsed.data.at > PENDING_SIGN_IN_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
