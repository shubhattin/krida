import ms from 'ms';
import { z } from 'zod';

/** Versioned key — bump the suffix if the stored shape changes. */
export const GUEST_AUTH_PROMPT_KEY = 'padavali:authPrompt:v2';
export const GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY = 'padavali:authPrompt:v2:shownThisSession';
export const GUEST_AUTH_PROMPT_SESSION_PULSED_KEY = 'padavali:authPrompt:v2:pulsedThisSession';
export const GUEST_AUTH_PROMPT_SESSION_VISIT_KEY = 'padavali:authPrompt:v2:visitedThisSession';
const LEGACY_PROMPT_KEY = 'padavali:authPrompt:v1';

export const guest_auth_prompt_trigger_schema = z.enum([
  'play_start',
  'complete',
  'personal_best',
  'milestone',
  'return_visit'
]);
export type GuestAuthPromptTrigger = z.infer<typeof guest_auth_prompt_trigger_schema>;

/** `open` auto-opens the popover; `pulse` only nudges the chip. */
export const guest_auth_prompt_mode_schema = z.enum(['open', 'pulse']);
export type GuestAuthPromptMode = z.infer<typeof guest_auth_prompt_mode_schema>;

export const guest_auth_prompt_event_schema = z.object({
  trigger: guest_auth_prompt_trigger_schema,
  mode: guest_auth_prompt_mode_schema
});
export type GuestAuthPromptEvent = z.infer<typeof guest_auth_prompt_event_schema>;

export const guest_auth_prompt_state_schema = z.object({
  shownCount: z.number().finite().nonnegative(),
  dismissedAt: z.number().finite().nullable(),
  lastShownAt: z.number().finite().nullable(),
  lastTrigger: guest_auth_prompt_trigger_schema.nullable(),
  visitCount: z.number().finite().nonnegative(),
  /** Scored puzzles finished as a guest on this device (practice excluded). */
  completedCount: z.number().finite().nonnegative(),
  /** Fastest guest solve per game kind, in seconds. */
  bestSeconds: z.record(z.string(), z.number().finite().nonnegative()),
  /** "Don't remind me" — no auto-open or pulse until this time. */
  snoozedUntil: z.number().finite().nullable()
});
export type GuestAuthPromptState = z.infer<typeof guest_auth_prompt_state_schema>;

/**
 * Wait after the Nth auto-open: 0 → now, 1 → 1d, 2 → 3d, 3 → 7d, 4 → 14d,
 * 5+ → every 30d. Never gives up — the long tail keeps it persistent.
 */
const BACKOFF_MS = [0, ms('1d'), ms('3d'), ms('7d'), ms('14d'), ms('30d')] as const;
/** Value moments (personal best, milestones) may jump the schedule, but not closer than this. */
const VALUE_MOMENT_GAP_MS = ms('3d');
const SNOOZE_MS = ms('90d');
/** "Don't remind me" is offered from the third auto-open on. */
const SNOOZE_OFFER_AFTER = 3;
const MILESTONES = [3, 10, 25, 50, 100] as const;

const EMPTY_STATE: GuestAuthPromptState = {
  shownCount: 0,
  dismissedAt: null,
  lastShownAt: null,
  lastTrigger: null,
  visitCount: 0,
  completedCount: 0,
  bestSeconds: {},
  snoozedUntil: null
};

function emptyState(): GuestAuthPromptState {
  return { ...EMPTY_STATE, bestSeconds: {} };
}

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
  if (!raw) return emptyState();
  try {
    const parsed = guest_auth_prompt_state_schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyState();
  } catch {
    return emptyState();
  }
}

function readState(): GuestAuthPromptState {
  const storage = browserStorage('local');
  if (!storage) return emptyState();
  try {
    return parseState(storage.getItem(GUEST_AUTH_PROMPT_KEY));
  } catch {
    return emptyState();
  }
}

export const GUEST_AUTH_STATE_EVENT = 'padavali:guest-auth-state';

function notifyStateChange() {
  try {
    window.dispatchEvent(new Event(GUEST_AUTH_STATE_EVENT));
  } catch {
    // No window (tests / SSR) — nothing is subscribed.
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
  notifyStateChange();
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

function backoffMs(shownCount: number): number {
  const index = Math.min(Math.max(shownCount, 0), BACKOFF_MS.length - 1);
  return BACKOFF_MS[index]!;
}

function isValueMoment(trigger: GuestAuthPromptTrigger): boolean {
  return trigger === 'personal_best' || trigger === 'milestone';
}

function isSnoozed(state: GuestAuthPromptState, nowMs: number): boolean {
  return state.snoozedUntil !== null && nowMs < state.snoozedUntil;
}

/** Latest of the last auto-open and the last dismissal — the backoff anchor. */
function backoffAnchor(state: GuestAuthPromptState): number {
  return Math.max(state.dismissedAt ?? 0, state.lastShownAt ?? 0);
}

/** Set while a guest is mid-puzzle; auto-open waits until the game ends. */
let guestGameActive = false;

export function setGuestGameActive(active: boolean) {
  guestGameActive = active;
}

export function readGuestAuthPromptState(): GuestAuthPromptState {
  return readState();
}

/**
 * Whether `trigger` may auto-open the popover now. Gameplay starts never do;
 * return visits need at least one finished puzzle so the guest has seen value.
 */
export function canAutoOpenGuestAuthPrompt(
  trigger: GuestAuthPromptTrigger,
  nowMs = Date.now()
): boolean {
  if (trigger === 'play_start') return false;
  if (sessionFlag(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY)) return false;
  const state = readState();
  if (isSnoozed(state, nowMs)) return false;
  if (trigger === 'return_visit' && state.completedCount < 1) return false;
  const anchor = backoffAnchor(state);
  if (anchor === 0) return true;
  const scheduled = backoffMs(state.shownCount);
  const wait = isValueMoment(trigger) ? Math.min(scheduled, VALUE_MOMENT_GAP_MS) : scheduled;
  return nowMs - anchor >= wait;
}

/** A chip pulse is cheap but still capped to one per tab session. */
export function canPulseGuestAuthPrompt(nowMs = Date.now()): boolean {
  if (sessionFlag(GUEST_AUTH_PROMPT_SESSION_PULSED_KEY)) return false;
  if (sessionFlag(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY)) return false;
  return !isSnoozed(readState(), nowMs);
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

export function canOfferGuestAuthSnooze(): boolean {
  return readState().shownCount >= SNOOZE_OFFER_AFTER;
}

/** "Don't remind me": silence auto-open and pulses for 90 days. */
export function snoozeGuestAuthPrompt(nowMs = Date.now()) {
  const state = readState();
  writeState({
    ...state,
    dismissedAt: nowMs,
    snoozedUntil: nowMs + SNOOZE_MS
  });
}

export function clearGuestAuthPrompt() {
  removeKey('local', GUEST_AUTH_PROMPT_KEY);
  removeKey('local', LEGACY_PROMPT_KEY);
  removeKey('session', GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
  removeKey('session', GUEST_AUTH_PROMPT_SESSION_PULSED_KEY);
  removeKey('session', GUEST_AUTH_PROMPT_SESSION_VISIT_KEY);
  notifyStateChange();
}

/**
 * Count a layout visit once per tab. Returns whether this is a return visit
 * (second tab session or later) worth a prompt request.
 */
export function noteGameVisit(): boolean {
  if (sessionFlag(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY)) return false;
  setSessionFlag(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY);
  const state = readState();
  const next = { ...state, visitCount: state.visitCount + 1 };
  writeState(next);
  return next.visitCount >= 2;
}

/**
 * Record a scored guest finish and pick the strongest trigger for it:
 * a faster solve than any previous one on this device, a round-number
 * milestone, or a plain completion.
 */
export function noteGuestCompletion(game: string, seconds: number): GuestAuthPromptTrigger {
  const state = readState();
  const completedCount = state.completedCount + 1;
  const previousBest = state.bestSeconds[game];
  const validSeconds = Number.isFinite(seconds) && seconds > 0;
  const personalBest = validSeconds && previousBest !== undefined && seconds < previousBest;
  const bestSeconds =
    validSeconds && (previousBest === undefined || seconds < previousBest)
      ? { ...state.bestSeconds, [game]: seconds }
      : state.bestSeconds;
  writeState({ ...state, completedCount, bestSeconds });
  if (personalBest) return 'personal_best';
  if (MILESTONES.some((milestone) => milestone === completedCount)) return 'milestone';
  return 'complete';
}

export function readGuestCompletedCount(): number {
  return readState().completedCount;
}

export function subscribeGuestAuthState(onChange: () => void): () => void {
  window.addEventListener(GUEST_AUTH_STATE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(GUEST_AUTH_STATE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export const GUEST_AUTH_PROMPT_EVENT = 'padavali:guest-auth-prompt';

/**
 * Ask the profile chip to nudge. Auto-opens when the backoff allows it,
 * otherwise falls back to a single chip pulse. Returns what happened.
 */
export function requestGuestAuthPrompt(
  trigger: GuestAuthPromptTrigger,
  nowMs = Date.now()
): GuestAuthPromptMode | null {
  const blockedByGame = guestGameActive && trigger === 'return_visit';
  let mode: GuestAuthPromptMode | null = null;
  if (!blockedByGame && canAutoOpenGuestAuthPrompt(trigger, nowMs)) {
    markGuestAuthPromptShown(trigger, nowMs);
    mode = 'open';
  } else if (canPulseGuestAuthPrompt(nowMs)) {
    setSessionFlag(GUEST_AUTH_PROMPT_SESSION_PULSED_KEY);
    mode = 'pulse';
  }
  if (!mode) return null;
  const detail: GuestAuthPromptEvent = { trigger, mode };
  try {
    window.dispatchEvent(new CustomEvent(GUEST_AUTH_PROMPT_EVENT, { detail }));
  } catch {
    return null;
  }
  return mode;
}
