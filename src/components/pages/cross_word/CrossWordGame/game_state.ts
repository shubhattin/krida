'use client';

import { atom } from 'jotai';
import type {
  CellPosition,
  CrossWordDirection,
  CrossWordPuzzle,
  NumberedEntry
} from '~/util/cross_word/cross_word_schema';

export type ActiveFocus = {
  row: number;
  col: number;
  direction: CrossWordDirection;
  entryId: string;
};

export const puzzle_atom = atom<CrossWordPuzzle | null>(null);
export const numbered_entries_atom = atom<NumberedEntry[]>([]);
export const player_grid_atom = atom<(string | null)[][]>([]);
export const started_atom = atom(false);
export const completed_atom = atom(false);
export const seconds_atom = atom(0);
export const game_session_nonce_atom = atom(0);
export const active_focus_atom = atom<ActiveFocus | null>(null);
export const solved_entry_ids_atom = atom<string[]>([]);
/** Entry ids that are fully filled but incorrect — soft feedback only. */
export const incorrect_entry_ids_atom = atom<string[]>([]);
export const celebration_fired_atom = atom(false);

export const progress_atom = atom((get) => {
  const entries = get(numbered_entries_atom);
  const solved = get(solved_entry_ids_atom);
  const total = entries.length;
  const solvedCount = solved.length;
  return {
    total,
    solvedCount,
    percent: total === 0 ? 0 : Math.round((solvedCount / total) * 100)
  };
});

export const active_entry_atom = atom((get) => {
  const focus = get(active_focus_atom);
  const entries = get(numbered_entries_atom);
  if (!focus) return null;
  return entries.find((entry) => entry.id === focus.entryId) ?? null;
});

export type { CellPosition };
