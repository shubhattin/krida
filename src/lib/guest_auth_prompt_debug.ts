import {
  clearGuestAuthPrompt,
  noteGuestCompletion,
  readGuestAuthPromptState,
  requestGuestAuthPrompt,
  type GuestAuthPromptTrigger
} from '~/lib/guest_auth_prompt';
import { isOneTapAvailable, promptOneTap } from '~/lib/one_tap';

/** Dev-only console handle: `__authPrompt.prompt()`, `.oneTap()`, `.state()`, `.reset()`. */
type GuestAuthPromptDebug = {
  /** Wipe backoff, session caps, snooze and the guest tally. */
  reset: () => void;
  /** Reset, then fire `trigger` through the real pipeline (pulse → One Tap / popover). */
  prompt: (trigger?: GuestAuthPromptTrigger) => void;
  /** Call One Tap directly, bypassing the prompt policy, and log the outcome. */
  oneTap: () => Promise<void>;
  state: () => void;
};

declare global {
  interface Window {
    __authPrompt?: GuestAuthPromptDebug;
  }
}

export function installGuestAuthPromptDebug() {
  if (window.__authPrompt) return;
  window.__authPrompt = {
    reset: () => {
      clearGuestAuthPrompt();
      console.info('[auth-prompt] state cleared');
    },
    prompt: (trigger = 'complete') => {
      clearGuestAuthPrompt();
      // Return-visit auto-open needs one finished puzzle on record.
      if (trigger === 'return_visit') noteGuestCompletion('debug', 60);
      console.info('[auth-prompt] request', trigger, '→', requestGuestAuthPrompt(trigger));
    },
    oneTap: async () => {
      console.info('[auth-prompt] One Tap available:', isOneTapAvailable());
      console.info('[auth-prompt] One Tap outcome:', await promptOneTap());
    },
    state: () => {
      console.table(readGuestAuthPromptState());
    }
  };
  console.info('[auth-prompt] dev helper ready: __authPrompt.prompt() / .oneTap() / .state()');
}
