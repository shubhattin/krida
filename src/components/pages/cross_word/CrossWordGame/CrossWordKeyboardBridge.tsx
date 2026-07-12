'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react';
import { useAtomValue } from 'jotai';
import { completed_atom, started_atom } from './game_state';
import styles from './crossword-game.module.css';

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
  return match[match.length - 1] ?? null;
}

/**
 * Hidden but focusable input that summons the OS virtual keyboard on mobile
 * without turning grid cells into real inputs. Desktop physical keyboard still
 * works through the same handlers (or the window listener when this is unfocused).
 */
export const CrossWordKeyboardBridge = forwardRef<
  CrossWordKeyboardBridgeHandle,
  CrossWordKeyboardBridgeProps
>(function CrossWordKeyboardBridge({ onKeyDown, onTypeLetter, onBackspace }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useAtomValue(started_atom);
  const completed = useAtomValue(completed_atom);
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
        el.focus({ preventScroll: true });
        // iOS sometimes needs a re-focus inside the same gesture tick
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

  useEffect(() => {
    if (!started || completed) {
      inputRef.current?.blur();
      clearInput();
    }
  }, [started, completed, clearInput]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!started || completed) return;
    if (event.nativeEvent.isComposing) return;

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
        onKeyDown(event.nativeEvent);
      }
      clearInput();
      return;
    }

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
    const letter = extractLetter(el.value);
    clearInput();

    if (letterHandledByKeyDownRef.current) {
      letterHandledByKeyDownRef.current = false;
      return;
    }

    if (letter) onTypeLetter(letter);
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
      // Keep value empty — visual letters live in the grid cells
      defaultValue=""
    />
  );
});
