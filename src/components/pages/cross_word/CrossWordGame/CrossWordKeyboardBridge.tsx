'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react';
import { useAtomValue } from 'jotai';
import { active_focus_atom, completed_atom, started_atom } from './game_state';
import styles from './crossword-game.module.css';

/** Marks the bridge input so the window keydown listener can skip it (avoid double-handling). */
export const CROSSWORD_KB_ATTR = 'data-crossword-kb';

export type CrossWordKeyboardBridgeHandle = {
  focus: () => void;
  blur: () => void;
};

type CrossWordKeyboardBridgeProps = {
  onKeyDown: (event: KeyboardEvent) => void;
  onTypeLetter: (letter: string) => void;
  onBackspace: () => void;
};

function extractLetter(raw: string): string | null {
  const match = raw.toUpperCase().match(/[A-Z]/g);
  if (!match || match.length === 0) return null;
  // Soft keyboards / IME may insert a run of text; take the last Latin letter.
  return match[match.length - 1] ?? null;
}

/**
 * Visually hidden but still focusable `<input>` that summons the OS soft keyboard
 * on mobile when the in-app virtual keyboard is disabled.
 *
 * Must NOT use `display:none`, `visibility:hidden`, or `type="hidden"` — those
 * cannot receive focus, so iOS/Android will not open the system keyboard.
 *
 * Letter commits come from native `beforeinput` / `input` / `compositionend`
 * (mobile soft keyboards + IME). Navigation/command keys (arrows, Tab, Space,
 * Backspace) go through `onKeyDown` → the same `handleKeyDown` / `backspace`
 * path as the physical window listener. A short-lived ref dedupes the common
 * desktop case where both `keydown` and `input` fire for one keystroke.
 */
export const CrossWordKeyboardBridge = forwardRef<
  CrossWordKeyboardBridgeHandle,
  CrossWordKeyboardBridgeProps
>(function CrossWordKeyboardBridge({ onKeyDown, onTypeLetter, onBackspace }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
  const focus = useAtomValue(active_focus_atom);
  /** Prevents letter double-fire when both keydown and input fire (desktop + some mobiles). */
  const letterHandledByKeyDownRef = useRef(false);

  const clearInput = useCallback(() => {
    const el = inputRef.current;
    if (el) el.value = '';
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        const el = inputRef.current;
        if (!el) return;
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        if (vv) {
          el.style.top = `${Math.max(0, vv.offsetTop)}px`;
          el.style.left = `${Math.max(0, vv.offsetLeft)}px`;
        }
        el.focus({ preventScroll: true });
        // iOS sometimes needs a re-focus inside the same gesture tick.
        requestAnimationFrame(() => {
          if (document.activeElement !== el) {
            el.focus({ preventScroll: true });
          }
        });
      },
      blur() {
        inputRef.current?.blur();
      }
    }),
    []
  );

  // Drop DOM focus when the session ends or the logical cell selection is cleared.
  useEffect(() => {
    if (!started || completed || !focus) {
      inputRef.current?.blur();
      clearInput();
    }
  }, [started, completed, focus, clearInput]);

  /**
   * Keep the focused bridge inside the *visual* viewport. If it stays pinned to
   * the grid (which can scroll off-screen), iOS scrolls the page back to the
   * input and blocks reaching the clue list under the soft keyboard.
   */
  useEffect(() => {
    const el = inputRef.current;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!el || !vv) return;

    const placeInVisualViewport = () => {
      if (document.activeElement !== el) return;
      // Top-left of the visible area — still focusable, never off-screen.
      el.style.top = `${Math.max(0, vv.offsetTop)}px`;
      el.style.left = `${Math.max(0, vv.offsetLeft)}px`;
    };

    placeInVisualViewport();
    vv.addEventListener('resize', placeInVisualViewport);
    vv.addEventListener('scroll', placeInVisualViewport);
    return () => {
      vv.removeEventListener('resize', placeInVisualViewport);
      vv.removeEventListener('scroll', placeInVisualViewport);
    };
  }, [started, completed, focus]);

  const commitLetter = useCallback(
    (raw: string) => {
      const letter = extractLetter(raw);
      clearInput();
      if (letterHandledByKeyDownRef.current) {
        letterHandledByKeyDownRef.current = false;
        return;
      }
      if (letter) onTypeLetter(letter);
    },
    [clearInput, onTypeLetter]
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!started || completed) return;
    // Never treat intermediate IME keystrokes as crossword input.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    const key = event.key;

    if (
      key === 'Backspace' ||
      key === 'Delete' ||
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight' ||
      key === 'Tab' ||
      key === ' '
    ) {
      event.preventDefault();
      if (key === 'Backspace' || key === 'Delete') {
        onBackspace();
      } else {
        // Reuse the game's navigation handlers (arrows / Tab / Space toggle).
        onKeyDown(event.nativeEvent);
      }
      clearInput();
      return;
    }

    // Desktop physical keys while the bridge is focused: handle here and mark
    // the ref so a following `input` event does not type the same letter twice.
    // Mobile soft keyboards often skip usable keydown and rely on input events.
    if (
      key.length === 1 &&
      /[a-zA-Z]/.test(key) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      letterHandledByKeyDownRef.current = true;
      onTypeLetter(key);
      clearInput();
    }
  };

  const handleBeforeInput = (event: FormEvent<HTMLInputElement> & { nativeEvent: InputEvent }) => {
    if (!started || completed) return;
    const inputEvent = event.nativeEvent;
    if (inputEvent.isComposing) return;

    if (
      inputEvent.inputType === 'deleteContentBackward' ||
      inputEvent.inputType === 'deleteContentForward'
    ) {
      event.preventDefault();
      onBackspace();
      clearInput();
      return;
    }

    if (inputEvent.inputType === 'insertText' || inputEvent.inputType === 'insertCompositionText') {
      const letter = extractLetter(inputEvent.data ?? '');
      if (!letter) return;
      event.preventDefault();
      if (letterHandledByKeyDownRef.current) {
        letterHandledByKeyDownRef.current = false;
        clearInput();
        return;
      }
      onTypeLetter(letter);
      clearInput();
    }
  };

  const handleInput = () => {
    if (!started || completed) {
      clearInput();
      return;
    }

    const el = inputRef.current;
    if (!el) return;
    commitLetter(el.value);
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    if (!started || completed) {
      clearInput();
      return;
    }
    // Final IME commit — only the confirmed character should reach the grid.
    commitLetter(event.data || inputRef.current?.value || '');
  };

  return (
    <input
      ref={inputRef}
      type="text"
      {...{ [CROSSWORD_KB_ATTR]: 'true' }}
      className={styles.keyboardBridge}
      aria-label="Crossword letter input"
      autoCapitalize="characters"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      inputMode="text"
      enterKeyHint="done"
      onKeyDown={handleKeyDown}
      onBeforeInput={handleBeforeInput as (event: FormEvent<HTMLInputElement>) => void}
      onInput={handleInput}
      onCompositionEnd={handleCompositionEnd}
      // Keep value empty — visual letters live in the grid cells.
      defaultValue=""
    />
  );
});
