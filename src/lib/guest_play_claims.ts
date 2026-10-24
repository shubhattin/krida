import ms from 'ms';
import { z } from 'zod';
import { game_kind_schema, type GameKind } from '~/util/catalog/tags';

/** Versioned key — bump the suffix if the stored shape changes. */
export const GUEST_PLAY_CLAIMS_KEY = 'padavali:guestPlays:v1';
export const GUEST_PLAY_CLAIMS_EVENT = 'padavali:guest-plays';

/** Same window the server signs into each token; older entries can no longer be claimed. */
const CLAIM_WINDOW_MS = ms('45d');
/** Matches `MAX_GUEST_CLAIMS` on the claim endpoint. */
const MAX_ENTRIES = 100;

const guest_play_claim_schema = z.object({
  kind: game_kind_schema,
  /** `puzzle_sessions.id` is a Postgres `serial` (int4). */
  session_id: z.number().int().positive().max(2_147_483_647),
  /** Server-signed proof this browser finished the play. */
  token: z.string().min(1),
  finished_at: z.number().finite()
});
export type GuestPlayClaim = z.infer<typeof guest_play_claim_schema>;

/** Entries are checked one by one so a single bad entry never drops the rest. */
const stored_guest_plays_schema = z.array(z.unknown());

function localStore(): Storage | null {
  try {
    // SAFETY: localStorage is window-only; this module is imported from client
    // components that also SSR. typeof is the environment check.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function notifyChange() {
  try {
    window.dispatchEvent(new Event(GUEST_PLAY_CLAIMS_EVENT));
  } catch {
    // No window (tests / SSR) — nothing is subscribed.
  }
}

function fresh(entries: GuestPlayClaim[], nowMs: number): GuestPlayClaim[] {
  return entries.filter((entry) => nowMs - entry.finished_at < CLAIM_WINDOW_MS);
}

export function readGuestPlayClaims(nowMs = Date.now()): GuestPlayClaim[] {
  const storage = localStore();
  if (!storage) return [];
  try {
    const raw = storage.getItem(GUEST_PLAY_CLAIMS_KEY);
    if (!raw) return [];
    const parsed = stored_guest_plays_schema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    const entries = parsed.data.flatMap((item) => {
      const entry = guest_play_claim_schema.safeParse(item);
      return entry.success ? [entry.data] : [];
    });
    return fresh(entries, nowMs);
  } catch {
    return [];
  }
}

function writeGuestPlayClaims(entries: GuestPlayClaim[]) {
  const storage = localStore();
  if (!storage) return;
  try {
    if (entries.length === 0) storage.removeItem(GUEST_PLAY_CLAIMS_KEY);
    else storage.setItem(GUEST_PLAY_CLAIMS_KEY, JSON.stringify(entries));
  } catch {
    // Private mode / quota — skip persist.
  }
  notifyChange();
}

/** Remember a finished guest play so it can be claimed after sign-in. Keeps the newest 100. */
export function rememberGuestPlay(
  kind: GameKind,
  sessionId: number,
  token: string,
  nowMs = Date.now()
) {
  const others = readGuestPlayClaims(nowMs).filter((entry) => entry.session_id !== sessionId);
  const next = [...others, { kind, session_id: sessionId, token, finished_at: nowMs }];
  writeGuestPlayClaims(next.slice(-MAX_ENTRIES));
}

/** Drop the given entries after a claim; anything added meanwhile stays. */
export function forgetGuestPlays(sessionIds: readonly number[]) {
  const drop = new Set(sessionIds);
  writeGuestPlayClaims(readGuestPlayClaims().filter((entry) => !drop.has(entry.session_id)));
}

/** Finished guest plays on this device that can still be claimed. */
export function readGuestPlayCount(): number {
  return readGuestPlayClaims().length;
}

export function subscribeGuestPlayClaims(onChange: () => void): () => void {
  window.addEventListener(GUEST_PLAY_CLAIMS_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(GUEST_PLAY_CLAIMS_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
