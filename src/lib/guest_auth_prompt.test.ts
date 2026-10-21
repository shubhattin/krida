import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GUEST_AUTH_PROMPT_KEY,
  GUEST_AUTH_PROMPT_SESSION_PULSED_KEY,
  GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY,
  GUEST_AUTH_PROMPT_SESSION_VISIT_KEY,
  canAutoOpenGuestAuthPrompt,
  canOfferGuestAuthSnooze,
  canPulseGuestAuthPrompt,
  clearGuestAuthPrompt,
  markGuestAuthPromptDismissed,
  markGuestAuthPromptShown,
  noteGameVisit,
  noteGuestCompletion,
  readGuestAuthPromptState,
  requestGuestAuthPrompt,
  setGuestGameActive,
  snoozeGuestAuthPrompt
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

/** The slice of `window` the module touches: storage and fire-and-forget events. */
type WindowStub = { localStorage: Storage; sessionStorage: Storage; dispatchEvent: () => boolean };

function defineGlobal(
  key: 'localStorage' | 'sessionStorage' | 'window',
  value: Storage | Window | WindowStub
) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

function installBrowser() {
  const local = memoryStorage();
  const session = memoryStorage();
  defineGlobal('localStorage', local);
  defineGlobal('sessionStorage', session);
  defineGlobal('window', {
    localStorage: local,
    sessionStorage: session,
    dispatchEvent: () => true
  });
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
    setGuestGameActive(false);
  });

  afterEach(() => {
    Date.now = realDateNow;
    restoreBrowser();
  });

  /** Simulate a fresh tab session. */
  function newTab() {
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY);
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_PULSED_KEY);
    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY);
  }

  it('allows the first completion auto-open', () => {
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(true);
  });

  it('never auto-opens on gameplay start — only pulses', () => {
    expect(canAutoOpenGuestAuthPrompt('play_start')).toBe(false);
    expect(requestGuestAuthPrompt('play_start')).toBe('pulse');
    expect(readGuestAuthPromptState().shownCount).toBe(0);
    // A start pulse does not burn the completion auto-open.
    expect(requestGuestAuthPrompt('complete')).toBe('open');
  });

  it('pulses at most once per tab session', () => {
    expect(requestGuestAuthPrompt('play_start')).toBe('pulse');
    expect(requestGuestAuthPrompt('play_start')).toBeNull();
    newTab();
    expect(requestGuestAuthPrompt('play_start')).toBe('pulse');
  });

  it('caps auto-open to once per tab session', () => {
    expect(requestGuestAuthPrompt('complete')).toBe('open');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(false);
    expect(requestGuestAuthPrompt('complete')).toBeNull();
  });

  it('backs off 1d, 3d, 7d, 14d, then every 30d without giving up', () => {
    const steps = [
      ['2026-01-01T23:59:00.000Z', '2026-01-02T00:00:00.000Z'],
      ['2026-01-04T23:59:00.000Z', '2026-01-05T00:00:00.000Z'],
      ['2026-01-11T23:59:00.000Z', '2026-01-12T00:00:00.000Z'],
      ['2026-01-25T23:59:00.000Z', '2026-01-26T00:00:00.000Z'],
      ['2026-02-24T23:59:00.000Z', '2026-02-25T00:00:00.000Z'],
      ['2026-03-26T23:59:00.000Z', '2026-03-27T00:00:00.000Z']
    ] as const;

    markGuestAuthPromptShown('complete');
    for (const [tooEarly, onTime] of steps) {
      newTab();
      setNow(tooEarly);
      expect(canAutoOpenGuestAuthPrompt('complete')).toBe(false);
      setNow(onTime);
      expect(canAutoOpenGuestAuthPrompt('complete')).toBe(true);
      markGuestAuthPromptShown('complete');
    }
    expect(readGuestAuthPromptState().shownCount).toBe(7);
  });

  it('anchors backoff on the latest of shown and dismissed', () => {
    markGuestAuthPromptShown('complete');
    markGuestAuthPromptDismissed();
    newTab();
    setNow('2026-01-02T00:00:00.000Z');
    markGuestAuthPromptShown('complete'); // second show, closed by navigating away
    newTab();
    // 3d from the second show, not from the stale first dismissal.
    setNow('2026-01-04T00:00:00.000Z');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(false);
    setNow('2026-01-05T00:00:00.000Z');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(true);
  });

  it('uses dismissedAt when it is later than the show', () => {
    markGuestAuthPromptShown('complete');
    setNow('2026-01-01T01:00:00.000Z');
    markGuestAuthPromptDismissed();
    newTab();
    setNow('2026-01-02T00:59:00.000Z');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(false);
    setNow('2026-01-02T01:00:00.000Z');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(true);
  });

  it('lets value moments jump a long backoff after 3 days', () => {
    for (let i = 0; i < 5; i++) markGuestAuthPromptShown('complete');
    newTab();
    setNow('2026-01-03T23:59:00.000Z');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(false);
    expect(canAutoOpenGuestAuthPrompt('personal_best')).toBe(false);
    setNow('2026-01-04T00:00:00.000Z');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(false);
    expect(canAutoOpenGuestAuthPrompt('personal_best')).toBe(true);
    expect(canAutoOpenGuestAuthPrompt('milestone')).toBe(true);
  });

  it('needs a finished puzzle before a return visit auto-opens', () => {
    expect(canAutoOpenGuestAuthPrompt('return_visit')).toBe(false);
    expect(requestGuestAuthPrompt('return_visit')).toBe('pulse');
    newTab();
    noteGuestCompletion('padavali', 90);
    expect(canAutoOpenGuestAuthPrompt('return_visit')).toBe(true);
  });

  it('holds return-visit auto-open while a guest game is running', () => {
    noteGuestCompletion('padavali', 90);
    setGuestGameActive(true);
    expect(requestGuestAuthPrompt('return_visit')).toBe('pulse');
    expect(readGuestAuthPromptState().shownCount).toBe(0);
  });

  it('snoozes auto-open and pulses for 90 days', () => {
    snoozeGuestAuthPrompt();
    expect(canAutoOpenGuestAuthPrompt('personal_best')).toBe(false);
    expect(canPulseGuestAuthPrompt()).toBe(false);
    expect(requestGuestAuthPrompt('complete')).toBeNull();
    setNow('2026-04-01T00:00:00.000Z');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(true);
  });

  it('offers "don\'t remind me" from the third auto-open', () => {
    markGuestAuthPromptShown('complete');
    markGuestAuthPromptShown('complete');
    expect(canOfferGuestAuthSnooze()).toBe(false);
    markGuestAuthPromptShown('complete');
    expect(canOfferGuestAuthSnooze()).toBe(true);
  });

  it('classifies completions as personal best, milestone, or plain', () => {
    expect(noteGuestCompletion('padavali', 120)).toBe('complete');
    expect(noteGuestCompletion('padavali', 150)).toBe('complete');
    expect(noteGuestCompletion('padajala', 300)).toBe('milestone'); // 3rd finish
    expect(noteGuestCompletion('padavali', 100)).toBe('personal_best');
    const state = readGuestAuthPromptState();
    expect(state.completedCount).toBe(4);
    expect(state.bestSeconds).toEqual({ padavali: 100, padajala: 300 });
  });

  it('does not treat the first solve of a game as a personal best', () => {
    expect(noteGuestCompletion('dvayi', 40)).toBe('complete');
    expect(noteGuestCompletion('dvayi', 0)).toBe('complete');
    expect(readGuestAuthPromptState().bestSeconds).toEqual({ dvayi: 40 });
  });

  it('clears persisted prompt state after sign-in', () => {
    markGuestAuthPromptShown('complete');
    noteGameVisit();
    noteGuestCompletion('padavali', 60);
    clearGuestAuthPrompt();
    expect(localStorage.getItem(GUEST_AUTH_PROMPT_KEY)).toBeNull();
    expect(sessionStorage.getItem(GUEST_AUTH_PROMPT_SESSION_SHOWN_KEY)).toBeNull();
    expect(sessionStorage.getItem(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY)).toBeNull();
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(true);
    expect(readGuestAuthPromptState().completedCount).toBe(0);
  });

  it('reports a return visit from the second tab session on', () => {
    expect(noteGameVisit()).toBe(false);
    expect(readGuestAuthPromptState().visitCount).toBe(1);
    expect(noteGameVisit()).toBe(false);

    sessionStorage.removeItem(GUEST_AUTH_PROMPT_SESSION_VISIT_KEY);
    expect(noteGameVisit()).toBe(true);
    expect(readGuestAuthPromptState().visitCount).toBe(2);
  });

  it('ignores corrupt localStorage JSON', () => {
    localStorage.setItem(GUEST_AUTH_PROMPT_KEY, '{not-json');
    expect(canAutoOpenGuestAuthPrompt('complete')).toBe(true);
    expect(readGuestAuthPromptState()).toEqual({
      shownCount: 0,
      dismissedAt: null,
      lastShownAt: null,
      lastTrigger: null,
      visitCount: 0,
      completedCount: 0,
      bestSeconds: {},
      snoozedUntil: null
    });
  });
});
