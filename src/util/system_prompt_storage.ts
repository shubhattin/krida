import { useCallback, useState, useSyncExternalStore } from 'react';

export type ImagePromptSubject = 'puzzle' | 'collection';

const storage_key = (subject: ImagePromptSubject) =>
  `krida:image-system-prompt-template-id:${subject}`;

/**
 * Last-selected template id, persisted per subject. Strict parse: anything
 * that isn't a positive integer id falls back to null (built-in default),
 * and the bad entry is cleared so it never poisons future loads.
 */
export function loadStoredTemplateId(subject: ImagePromptSubject): number | null {
  try {
    const raw = window.localStorage.getItem(storage_key(subject));
    if (raw == null || !/^\d+$/.test(raw.trim())) return null;
    const id = Number(raw.trim());
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return id;
  } catch {
    return null;
  }
}

export function saveStoredTemplateId(subject: ImagePromptSubject, id: number | null): void {
  try {
    const key = storage_key(subject);
    if (id == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(id));
  } catch {
    // storage unavailable — selection simply won't persist
  }
}

const subscribe_storage = (on_change: () => void) => {
  window.addEventListener('storage', on_change);
  return () => window.removeEventListener('storage', on_change);
};

/**
 * Last-selected template id with SSR-safe hydration (null on server, stored
 * value on client — no hydration mismatch warning) and cross-tab sync.
 * null = built-in default.
 */
export function useStoredTemplateId(subject: ImagePromptSubject) {
  const get_snapshot = useCallback(() => loadStoredTemplateId(subject), [subject]);
  const stored = useSyncExternalStore(subscribe_storage, get_snapshot, () => null);
  const [override, set_override] = useState<number | null | undefined>(undefined);
  const set_value = useCallback(
    (next: number | null) => {
      saveStoredTemplateId(subject, next);
      set_override(next);
    },
    [subject]
  );
  return [override === undefined ? stored : override, set_value] as const;
}
