import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ms from 'ms';
import {
  GUEST_PLAY_CLAIMS_KEY,
  forgetGuestPlays,
  readGuestPlayClaims,
  readGuestPlayCount,
  rememberGuestPlay
} from './guest_play_claims';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key) {
      return map.get(key) ?? null;
    },
    key(index) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key) {
      map.delete(key);
    },
    setItem(key, value) {
      map.set(key, String(value));
    }
  };
}

const savedWindow = globalThis.window;

/** The slice of `window` the module touches: storage and fire-and-forget events. */
type WindowStub = { localStorage: Storage; dispatchEvent: () => boolean };

function defineWindow(value: Window | WindowStub) {
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value });
}

let local: Storage;

beforeEach(() => {
  local = memoryStorage();
  defineWindow({ localStorage: local, dispatchEvent: () => true });
});

afterEach(() => {
  defineWindow(savedWindow);
});

const NOW = Date.UTC(2026, 9, 1);

describe('guest play claims', () => {
  it('remembers finished plays once per session', () => {
    rememberGuestPlay('padavali', 1, 'tok-1', NOW);
    rememberGuestPlay('dvayi', 2, 'tok-2', NOW);
    rememberGuestPlay('dvayi', 2, 'tok-2b', NOW);
    expect(readGuestPlayClaims(NOW).map((entry) => [entry.session_id, entry.token])).toEqual([
      [1, 'tok-1'],
      [2, 'tok-2b']
    ]);
  });

  it('drops plays older than the 45 day window', () => {
    rememberGuestPlay('padavali', 1, 'tok-1', NOW - ms('46d'));
    rememberGuestPlay('padavali', 2, 'tok-2', NOW);
    expect(readGuestPlayClaims(NOW).map((entry) => entry.session_id)).toEqual([2]);
  });

  it('keeps only the newest 100', () => {
    for (let id = 1; id <= 105; id++) rememberGuestPlay('surupa', id, `tok-${id}`, NOW);
    const ids = readGuestPlayClaims(NOW).map((entry) => entry.session_id);
    expect(ids).toHaveLength(100);
    expect(ids[0]).toBe(6);
  });

  it('forgets only the claimed entries', () => {
    rememberGuestPlay('padavali', 1, 'tok-1');
    rememberGuestPlay('padajala', 2, 'tok-2');
    forgetGuestPlays([1]);
    expect(readGuestPlayCount()).toBe(1);
    forgetGuestPlays([2]);
    expect(local.getItem(GUEST_PLAY_CLAIMS_KEY)).toBeNull();
  });

  it('keeps valid entries next to a malformed one', () => {
    rememberGuestPlay('padavali', 1, 'tok-1', NOW);
    const stored = JSON.parse(local.getItem(GUEST_PLAY_CLAIMS_KEY) ?? '[]');
    local.setItem(
      GUEST_PLAY_CLAIMS_KEY,
      JSON.stringify([...stored, { kind: 'chess', session_id: -1, token: '' }])
    );
    expect(readGuestPlayClaims(NOW).map((entry) => entry.session_id)).toEqual([1]);
  });

  it('ignores corrupt storage', () => {
    local.setItem(GUEST_PLAY_CLAIMS_KEY, '{nope');
    expect(readGuestPlayClaims()).toEqual([]);
  });
});
