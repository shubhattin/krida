'use client';

import { useCallback, useMemo, type FormEvent, type KeyboardEvent } from 'react';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { isLipiToggleKey } from '~/components/puzzle/LipiLekhikaSwitch';
import { useEditorHistoryActions, useHistoryTextField } from '~/hooks/useEditorHistory';

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

type BindOptions = {
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<FieldElement>) => void;
};

/**
 * Shared Lipi Lekhika + undo-history wiring for editor text fields.
 * `bind(value, setValue)` returns the props for an `<Input>` / `<Textarea>`.
 * Alt+X / Alt+C toggles typing for the whole group.
 */
export function useLipiBinder(
  lipi: boolean,
  setLipi: (update: (prev: boolean) => boolean) => void
) {
  const typing = useMemo(() => createTypingContext('Devanagari'), []);
  const field = useHistoryTextField();
  const { commit } = useEditorHistoryActions();

  return useCallback(
    (value: string, onValue: (value: string) => void, options?: BindOptions) => ({
      value,
      onFocus: field.onFocus,
      onChange: (event: FormEvent<FieldElement>) => onValue(event.currentTarget.value),
      onBeforeInput: (event: FormEvent<FieldElement>) =>
        handleTypingBeforeInputEvent(typing, event, onValue, lipi),
      onBlur: () => {
        field.onBlur();
        typing.clearContext();
        options?.onBlur?.();
        commit();
      },
      onKeyDown: (event: KeyboardEvent<FieldElement>) => {
        if (isLipiToggleKey(event)) {
          event.preventDefault();
          setLipi((prev) => !prev);
        }
        clearTypingContextOnKeyDown(event, typing);
        options?.onKeyDown?.(event);
      }
    }),
    [commit, field, lipi, setLipi, typing]
  );
}
