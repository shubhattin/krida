/**
 * Runtime padajala game model used by PadajalaGame UI.
 * Adapted from DB `CrossordPuzzle` at the page/API boundary.
 */

export type PadajalaCell = string | null;
export type PadajalaDirection = 'across' | 'down';

export type PadajalaEntry = {
  id: string;
  answer: string;
  /** Devanagari Sanskrit form — romanized in the clue panel after solve */
  word_dev: string;
  clue: string;
  row: number;
  col: number;
  direction: PadajalaDirection;
};

export type PadajalaGamePuzzle = {
  id: number;
  title: string;
  description: string;
  dimensions: [number, number];
  grid: PadajalaCell[][];
  entries: PadajalaEntry[];
};

export type CellPosition = { row: number; col: number };

export type NumberedEntry = PadajalaEntry & {
  number: number;
};

export function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function getEntryCells(
  entry: Pick<PadajalaEntry, 'row' | 'col' | 'direction' | 'answer'>
): CellPosition[] {
  return Array.from({ length: entry.answer.length }, (_, i) =>
    entry.direction === 'across'
      ? { row: entry.row, col: entry.col + i }
      : { row: entry.row + i, col: entry.col }
  );
}

/** Assign clue numbers by start coordinate (row-major). */
export function numberEntries(entries: PadajalaEntry[]): NumberedEntry[] {
  const starts = new Map<string, number>();
  let next = 1;

  const sortedStarts = [...entries].toSorted((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  for (const entry of sortedStarts) {
    const key = cellKey(entry.row, entry.col);
    if (!starts.has(key)) {
      starts.set(key, next++);
    }
  }

  return entries.map((entry) => ({
    ...entry,
    number: starts.get(cellKey(entry.row, entry.col))!
  }));
}

export function createEmptyPlayerGrid(grid: PadajalaCell[][]): (string | null)[][] {
  return grid.map((row) =>
    row.map((cell) => {
      if (cell === null) return null;
      if (cell === '') return '';
      return cell;
    })
  );
}

export function isEditableCell(template: PadajalaCell) {
  return template === '';
}

export function isBlockedCell(template: PadajalaCell) {
  return template === null;
}

export function isFixedCell(template: PadajalaCell) {
  return template !== null && template.length === 1;
}

export function getCellLetter(
  playerGrid: (string | null)[][],
  template: PadajalaCell[][],
  row: number,
  col: number
): string {
  const fixed = template[row]?.[col];
  if (fixed === null || fixed === undefined) return '';
  if (fixed !== '') return fixed;
  return playerGrid[row]?.[col] ?? '';
}

export function composeEntryAnswer(
  entry: PadajalaEntry,
  playerGrid: (string | null)[][],
  template: PadajalaCell[][]
): string {
  return getEntryCells(entry)
    .map(({ row, col }) => getCellLetter(playerGrid, template, row, col))
    .join('');
}

export function isEntryFilled(
  entry: PadajalaEntry,
  playerGrid: (string | null)[][],
  template: PadajalaCell[][]
) {
  return getEntryCells(entry).every(
    ({ row, col }) => getCellLetter(playerGrid, template, row, col) !== ''
  );
}

export function isEntryCorrect(
  entry: PadajalaEntry,
  playerGrid: (string | null)[][],
  template: PadajalaCell[][]
) {
  return composeEntryAnswer(entry, playerGrid, template) === entry.answer;
}

export function findEntriesAtCell(entries: PadajalaEntry[], row: number, col: number) {
  return entries.filter((entry) =>
    getEntryCells(entry).some((cell) => cell.row === row && cell.col === col)
  );
}

/** Next non-blocked, non-prefilled cell in a cardinal direction (for arrow keys). */
export function nextPlayableCell(
  template: PadajalaCell[][],
  row: number,
  col: number,
  dRow: number,
  dCol: number
): CellPosition | null {
  const rows = template.length;
  const cols = template[0]?.length ?? 0;
  let r = row + dRow;
  let c = col + dCol;

  while (r >= 0 && c >= 0 && r < rows && c < cols) {
    // Skip blocks and prefilled hints — arrows should land on player-editable cells only.
    if (isEditableCell(template[r]![c]!)) {
      return { row: r, col: c };
    }
    r += dRow;
    c += dCol;
  }

  return null;
}

export function nextCellInEntry(
  entry: PadajalaEntry,
  row: number,
  col: number,
  step: 1 | -1
): CellPosition | null {
  const cells = getEntryCells(entry);
  const index = cells.findIndex((cell) => cell.row === row && cell.col === col);
  if (index === -1) return null;
  return cells[index + step] ?? null;
}

export function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
