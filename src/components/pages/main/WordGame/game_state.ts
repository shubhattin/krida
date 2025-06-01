import { atom } from 'jotai';

export type CellPosition = { row: number; col: number };
export type Selection = { cells: CellPosition[]; word: string };

export const title_atom = atom('');
export const word_list_atom = atom<string[]>([]);
export const grid_data_atom = atom<string[][]>([]);
export const grid_dimensions_atom = atom<[number, number]>([0, 0]);
export const started_atom = atom(false);
export const completed_atom = atom(false);
export const current_selection_atom = atom<CellPosition[]>([]);
export const found_words_atom = atom<Selection[]>([]);
export const seconds_atom = atom(0);
export const total_attempts_atom = atom(0);
export const correct_attempts_atom = atom(0);
