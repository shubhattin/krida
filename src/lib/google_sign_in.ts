import ms from 'ms';
import { z } from 'zod';
import { load_posthog } from '~/components/tags/PosthogInit';
import { signIn } from '~/lib/auth-client';
import {
  guest_auth_prompt_trigger_schema,
  type GuestAuthPromptTrigger
} from '~/lib/guest_auth_prompt';

/** Where the guest clicked "Continue with Google". */
export const sign_in_surface_schema = z.enum(['popover', 'inline', 'menu', 'dashboard']);
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

/**
 * Start the Google redirect sign-in, remembering which surface and prompt
 * trigger led here so the post-login page can attribute the conversion.
 */
export async function startGoogleSignIn(
  surface: SignInSurface,
  trigger: GuestAuthPromptTrigger | null = null
) {
  captureAuthPromptEvent('auth_prompt_clicked', { surface, trigger });
  try {
    sessionStore()?.setItem(
      PENDING_SIGN_IN_KEY,
      JSON.stringify({ surface, trigger, at: Date.now() })
    );
  } catch {
    // Private mode — attribution is best-effort.
  }
  await signIn.social({
    provider: 'google',
    callbackURL: window.location.href
  });
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
