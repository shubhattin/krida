import { useMemo, useSyncExternalStore } from 'react';
import { functionalUpdate, type OnChangeFn } from '@tanstack/react-table';
import { z } from 'zod';
import type { ColumnVisibilityState } from '~/components/ui/data-table';

const STORAGE_PREFIX = 'admin_table_columns:v2:';
// Bumped from v1 so stale prefs (e.g. uid:true) reset to current defaults (uid hidden).
const stored_visibility_schema = z.record(z.string(), z.boolean());

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readRaw(key: string) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_PREFIX + key);
    else window.localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    // Storage can be unavailable (private mode, quota); the change is simply not kept.
  }
  for (const listener of listeners) listener();
}

function parseStored(raw: string | null): ColumnVisibilityState {
  if (!raw) return {};
  try {
    const parsed = stored_visibility_schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/**
 * Column visibility remembered per table in localStorage. Stored choices layer
 * over `defaults`, so columns added later still start in their default state.
 */
export function usePersistentColumnVisibility(key: string, defaults: ColumnVisibilityState) {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null
  );

  const visibility = useMemo(() => ({ ...defaults, ...parseStored(raw) }), [defaults, raw]);

  const onChange: OnChangeFn<ColumnVisibilityState> = (updater) => {
    writeRaw(key, JSON.stringify(functionalUpdate(updater, visibility)));
  };

  const reset = () => writeRaw(key, null);

  return { visibility, onChange, reset };
}
