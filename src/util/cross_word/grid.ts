import type { CrossordPuzzleGridCell } from '~/db/schema_zod';

export const CROSSWORD_MIN_DIM = 3;
export const CROSSWORD_MAX_DIM = 30;
export const CROSSWORD_DEFAULT_DIM: [number, number] = [10, 10];

/** Empty text = blocked box slot */
export function createEmptyCell(): CrossordPuzzleGridCell {
  return { text: '', is_visible: false };
}

export function createLetterCell(letter: string, is_visible = false): CrossordPuzzleGridCell {
  return { text: letter.toUpperCase(), is_visible };
}

/** New grids start as all blocked boxes; type letters to open playable cells. */
export function createEmptyGridData(dimensions: [number, number]): CrossordPuzzleGridCell[][] {
  const [rows, cols] = dimensions;
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => createEmptyCell()));
}

export function clampDimension(value: number): number {
  return Math.min(CROSSWORD_MAX_DIM, Math.max(CROSSWORD_MIN_DIM, Math.floor(value)));
}

export function normalizeAlphaLetter(raw: string): string {
  const matches = raw.toUpperCase().match(/[A-Z]/g);
  if (!matches || matches.length === 0) return '';
  return matches[matches.length - 1]!;
}

/** Blank text means a blocked box. */
export function isBoxCell(cell: CrossordPuzzleGridCell): boolean {
  return cell.text.length === 0;
}

export function cellHasLetter(cell: CrossordPuzzleGridCell): boolean {
  return cell.text.length > 0;
}

export function getCellLetter(cell: CrossordPuzzleGridCell): string {
  return cell.text.toUpperCase();
}

/** 0-based row → A, B, … Z, AA, AB, … */
export function rowIndexToLetter(row: number): string {
  let n = Math.floor(row);
  if (n < 0) return '';
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/** 0-based col → 1-based number string */
export function colIndexToNumberLabel(col: number): string {
  return String(Math.floor(col) + 1);
}

/** Display ref like A5 for internal [row, col] indices */
export function formatGridCellRef(row: number, col: number): string {
  return `${rowIndexToLetter(row)}${colIndexToNumberLabel(col)}`;
}
