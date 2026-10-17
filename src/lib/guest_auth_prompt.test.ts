import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GUEST_AUTH_PROMPT_KEY,
  GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY,
  GUEST_AUTH_PROMPT_SESSION_VISIT_KEY,
  canShowGuestAuthPrompt,
  clearGuestAuthPrompt,
  markGuestAuthPromptDismissed,
  markGuestAuthPromptShown,
  noteGameVisit,
  readGuestAuthPromptState
} from './guest_auth_prompt';

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

const savedLocalStorage = globalThis.localStorage;
const savedSessionStorage = globalThis.sessionStorage;
const savedWindow = globalThis.window;

function defineGlobal(key: 'localStorage' | 'sessionStorage' | 'window', value: Storage | Window) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

function installBrowser() {
  const local = memoryStorage();
  const session = memoryStorage();
  defineGlobal('localStorage', local);
  defineGlobal('sessionStorage', session);
  // SAFETY: these tests only read window.localStorage and window.sessionStorage.
  defineGlobal('window', { localStorage: local, sessionStorage: session } as Window);
}

function restoreBrowser() {
  defineGlobal('localStorage', savedLocalStorage);
  defineGlobal('sessionStorage', savedSessionStorage);
  defineGlobal('window', savedWindow);
}

const realDateNow = Date.now;
const START = '2026-01-01T00:00:00.000Z';
let nowMs = Date.parse(START);

function setNow(iso: string) {
  nowMs = Date.parse(iso);
}

describe('guest_auth_prompt', () => {
  beforeEach(() => {
    installBrowser();
    setNow(START);
    Date.now = () => nowMs;
  });

  afterEach(() => {
    Date.now = realDateNow;
    restoreBrowser();
  });

  it('allows the first auto-open', () => {
    expect(canShowGuestAuthPrompt()).toBe(true);
  });

  it('caps auto-open to once per tab session', () => {
    markGuestAuthPromptShown('play_start');
    expect(canShowGuestAuthPrompt()).toBe(false);
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    expect(canShowGuestAuthPrompt()).toBe(false);
  });

  it('waits 1 day after the first show, then 3 days, then 7 days, then stops', () => {
    markGuestAuthPromptShown('play_start');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    expect(readGuestAuthPromptState().shownCount).toBe(1);
    expect(canShowGuestAuthPrompt()).toBe(false);

    setNow('2026-01-01T12:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(false);

    setNow('2026-01-02T00:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(true);

    markGuestAuthPromptShown('complete');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    setNow('2026-01-04T00:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(false);

    setNow('2026-01-05T00:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(true);

    markGuestAuthPromptShown('return_visit');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    setNow('2026-01-11T00:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(false);

    setNow('2026-01-12T00:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(true);

    markGuestAuthPromptShown('play_start');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    setNow('2027-01-01T00:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(false);
    expect(readGuestAuthPromptState().shownCount).toBe(4);
  });

  it('uses dismissedAt for backoff when present', () => {
    markGuestAuthPromptShown('play_start');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    setNow('2026-01-01T01:00:00.000Z');
    markGuestAuthPromptDismissed();
    expect(canShowGuestAuthPrompt()).toBe(false);

    setNow('2026-01-02T00:59:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(false);

    setNow('2026-01-02T01:00:00.000Z');
    expect(canShowGuestAuthPrompt()).toBe(true);
  });

  it('clears persisted prompt state after sign-in', () => {
    markGuestAuthPromptShown('complete');
    noteGameVisit();
    clearGuestAuthPrompt();
    expect(localStorage.getItem(GUEST_AUTH_PROMPT_KEY)).toBeNull();
    expect(sessionStorage.getItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY)).toBeNull();
    expect(sessionStorage.getItem(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY)).toBeNull();
    expect(canShowGuestAuthPrompt()).toBe(true);
  });

  it('prompts on the second layout visit, not the first', () => {
    expect(noteGameVisit()).toBe(false);
    expect(readGuestAuthPromptState().visitCount).toBe(1);
    expect(noteGameVisit()).toBe(false);

    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY);
    expect(noteGameVisit()).toBe(true);
    expect(readGuestAuthPromptState().visitCount).toBe(2);
  });

  it('ignores corrupt localStorage JSON', () => {
    localStorage.setItem(GUEST_AUTH_PROMPT_KEY, '{not-json');
    expect(canShowGuestAuthPrompt()).toBe(true);
    expect(readGuestAuthPromptState()).toEqual({
      shownCount: 0,
      dismissedAt: null,
      lastShownAt: null,
      lastTrigger: null,
      visitCount: 0
    });
  });
});
