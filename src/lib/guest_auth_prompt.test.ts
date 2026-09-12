import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('guest_auth_prompt', () => {
  beforeEach(() => {
    const localStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('window', { localStorage, sessionStorage });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(false);

    vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(true);

    markGuestAuthPromptShown('complete');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    vi.setSystemTime(new Date('2026-01-04T00:00:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(false);

    vi.setSystemTime(new Date('2026-01-05T00:00:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(true);

    markGuestAuthPromptShown('return_visit');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    vi.setSystemTime(new Date('2026-01-11T00:00:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(false);

    vi.setSystemTime(new Date('2026-01-12T00:00:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(true);

    markGuestAuthPromptShown('play_start');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(false);
    expect(readGuestAuthPromptState().shownCount).toBe(4);
  });

  it('uses dismissedAt for backoff when present', () => {
    markGuestAuthPromptShown('play_start');
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    vi.setSystemTime(new Date('2026-01-01T01:00:00.000Z'));
    markGuestAuthPromptDismissed();
    expect(canShowGuestAuthPrompt()).toBe(false);

    vi.setSystemTime(new Date('2026-01-02T00:59:00.000Z'));
    expect(canShowGuestAuthPrompt()).toBe(false);

    vi.setSystemTime(new Date('2026-01-02T01:00:00.000Z'));
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
