import { atom } from 'jotai';
import { word_game_msgs } from './msgs';

export type CellPosition = { row: number; col: number };
export type Selection = { cells: CellPosition[]; word: string };

export const title_current_atom = atom('');
export const grid_data_current_atom = atom<string[][]>([]);
export const grid_dimensions_atom = atom<[number, number]>([0, 0]);
export const original_word_list_atom = atom<string[]>([]);
export const started_atom = atom(false);
export const completed_atom = atom(false);
export const current_selection_atom = atom<CellPosition[]>([]);
export const found_words_atom = atom<Selection[]>([]);
export const seconds_atom = atom(0);
export const total_attempts_atom = atom(0);
export const word_msgs_atom = atom<typeof word_game_msgs>({} as typeof word_game_msgs);
export const pending_navigation_url_atom = atom<string | null>(null);
export const puzzle_slug_atom = atom('');
