import { atom } from 'jotai';
import { word_game_msgs } from './msgs';

export type CellPosition = { row: number; col: number };
export type Selection = { cells: CellPosition[]; word: string };

export const title_current_atom = atom('');
export const description_current_atom = atom<string | null>(null);
export const grid_data_current_atom = atom<string[][]>([]);
export const grid_dimensions_atom = atom<[number, number]>([0, 0]);
export const original_word_list_atom = atom<string[]>([]);
export const started_atom = atom(false);
export const completed_atom = atom(false);
/** True when the player revealed AI word meanings before completing the puzzle. */
export const practice_mode_atom = atom(false);
/**
 * Incremented every time a fresh play session starts within the same mounted puzzle.
 * Consumers use this as a reset signal for per-session side effects, especially
 * metrics submission and Turnstile tokens, without relying on puzzle remounts.
 */
export const game_session_nonce_atom = atom(0);
export const current_selection_atom = atom<CellPosition[]>([]);
export const found_words_atom = atom<Selection[]>([]);
/** Visual-only highlight of an unfound word; does not count as selected. */
export const revealed_word_atom = atom<Selection | null>(null);
export const seconds_atom = atom(0);
export const total_attempts_atom = atom(0);
export const word_msgs_atom = atom<typeof word_game_msgs>({} as typeof word_game_msgs);
export const pending_navigation_url_atom = atom<string | null>(null);
export const puzzle_slug_atom = atom('');

/** Puzzle id for the WordGame mounted on the current page; null when none. */
export const active_puzzle_id_atom = atom<number | null>(null);
