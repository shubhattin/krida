import ms from 'ms';
import { z } from 'zod';

/** Versioned key — bump the suffix if the stored shape changes. */
export const GUEST_AUTH_PROMPT_KEY = 'padavali:authPrompt:v1';
export const GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY = 'padavali:authPrompt:v1:shownThisSession';
export const GUEST_AUTH_PROMPT_SESSION_VISIT_KEY = 'padavali:authPrompt:v1:visitedThisSession';

export const guest_auth_prompt_trigger_schema = z.enum(['play_start', 'complete', 'return_visit']);
export type GuestAuthPromptTrigger = z.infer<typeof guest_auth_prompt_trigger_schema>;

export const guest_auth_prompt_state_schema = z.object({
  shownCount: z.number().finite().nonnegative(),
  dismissedAt: z.number().finite().nullable(),
  lastShownAt: z.number().finite().nullable(),
  lastTrigger: guest_auth_prompt_trigger_schema.nullable(),
  visitCount: z.number().finite().nonnegative()
});
export type GuestAuthPromptState = z.infer<typeof guest_auth_prompt_state_schema>;

/** shownCount 0 → now; 1 → 1d; 2 → 3d; 3 → 7d; 4+ → never. */
const BACKOFF_MS = [0, ms('1d'), ms('3d'), ms('7d')] as const;

const EMPTY_STATE: GuestAuthPromptState = {
  shownCount: 0,
  dismissedAt: null,
  lastShownAt: null,
  lastTrigger: null,
  visitCount: 0
};

function browserStorage(kind: 'local' | 'session'): Storage | null {
  try {
    // SAFETY: localStorage/sessionStorage are window-only; this module is imported
    // from client components that also SSR. typeof is the environment check.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function parseState(raw: string | null): GuestAuthPromptState {
  if (!raw) return { ...EMPTY_STATE };
  try {
    const parsed = guest_auth_prompt_state_schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { ...EMPTY_STATE };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function readState(): GuestAuthPromptState {
  const storage = browserStorage('local');
  if (!storage) return { ...EMPTY_STATE };
  try {
    return parseState(storage.getItem(GUEST_AUTH_PROMPT_KEY));
  } catch {
    return { ...EMPTY_STATE };
  }
}

function writeState(state: GuestAuthPromptState) {
  const storage = browserStorage('local');
  if (!storage) return;
  try {
    storage.setItem(GUEST_AUTH_PROMPT_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota — skip persist.
  }
}

function sessionFlag(key: string): boolean {
  const storage = browserStorage('session');
  if (!storage) return false;
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setSessionFlag(key: string) {
  const storage = browserStorage('session');
  if (!storage) return;
  try {
    storage.setItem(key, '1');
  } catch {
    // Private mode / quota — skip persist.
  }
}

function removeKey(kind: 'local' | 'session', key: string) {
  const storage = browserStorage(kind);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Private mode — ignore.
  }
}

function backoffMs(shownCount: number): number | null {
  if (shownCount <= 0) return 0;
  if (shownCount >= 4) return null;
  return BACKOFF_MS[shownCount] ?? null;
}

export function readGuestAuthPromptState(): GuestAuthPromptState {
  return readState();
}

export function canShowGuestAuthPrompt(nowMs = Date.now()): boolean {
  if (sessionFlag(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY)) return false;
  const state = readState();
  const wait = backoffMs(state.shownCount);
  if (wait === null) return false;
  if (wait === 0) return true;
  const from = state.dismissedAt ?? state.lastShownAt ?? 0;
  if (from === 0) return true;
  return nowMs - from >= wait;
}

export function markGuestAuthPromptShown(trigger: GuestAuthPromptTrigger, nowMs = Date.now()) {
  setSessionFlag(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
  const state = readState();
  writeState({
    ...state,
    shownCount: state.shownCount + 1,
    lastShownAt: nowMs,
    lastTrigger: trigger
  });
}

export function markGuestAuthPromptDismissed(nowMs = Date.now()) {
  const state = readState();
  writeState({
    ...state,
    dismissedAt: nowMs
  });
}

export function clearGuestAuthPrompt() {
  removeKey('local', GUEST_AUTH_PROMPT_KEY);
  removeKey('session', GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
  removeKey('session', GUEST_AUTH_PROMPT_SESSION_VISIT_KEY);
}

/**
 * Count a layout visit once per tab. Returns whether this is a return visit
 * that is allowed to auto-open the guest prompt.
 */
export function noteGameVisit(): boolean {
  if (sessionFlag(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY)) return false;
  setSessionFlag(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY);
  const state = readState();
  const next = { ...state, visitCount: state.visitCount + 1 };
  writeState(next);
  return next.visitCount >= 2 && canShowGuestAuthPrompt();
}

export const GUEST_AUTH_PROMPT_EVENT = 'padavali:guest-auth-prompt';

export function requestGuestAuthPrompt(trigger: GuestAuthPromptTrigger): boolean {
  if (!canShowGuestAuthPrompt()) return false;
  markGuestAuthPromptShown(trigger);
  try {
    window.dispatchEvent(new CustomEvent(GUEST_AUTH_PROMPT_EVENT, { detail: trigger }));
  } catch {
    return false;
  }
  return true;
}
