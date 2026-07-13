import type { CrossordPuzzleGridCell } from '~/db/schema_zod';

export const CROSSWORD_MIN_DIM = 3;
export const CROSSWORD_MAX_DIM = 30;
export const CROSSWORD_DEFAULT_DIM: [number, number] = [10, 10];

export function createEmptyAlphaCell(): CrossordPuzzleGridCell {
  return { type: 'alpha', text: '', is_visible: false };
}

export function createBoxCell(): CrossordPuzzleGridCell {
  return { type: 'box' };
}

export function createEmptyGridData(dimensions: [number, number]): CrossordPuzzleGridCell[][] {
  const [rows, cols] = dimensions;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => createEmptyAlphaCell())
  );
}

export function clampDimension(value: number): number {
  return Math.min(CROSSWORD_MAX_DIM, Math.max(CROSSWORD_MIN_DIM, Math.floor(value)));
}

export function normalizeAlphaLetter(raw: string): string {
  const matches = raw.toUpperCase().match(/[A-Z]/g);
  if (!matches || matches.length === 0) return '';
  return matches[matches.length - 1]!;
}

export function isAlphaCell(
  cell: CrossordPuzzleGridCell
): cell is Extract<CrossordPuzzleGridCell, { type: 'alpha' }> {
  return cell.type === 'alpha';
}

export function cellHasLetter(cell: CrossordPuzzleGridCell): boolean {
  return cell.type === 'alpha' && cell.text.length > 0;
}

export function getCellLetter(cell: CrossordPuzzleGridCell): string {
  return cell.type === 'alpha' ? cell.text.toUpperCase() : '';
}
