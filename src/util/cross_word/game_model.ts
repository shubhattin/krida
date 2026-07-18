/**
 * Runtime crossword game model used by CrossWordGame UI.
 * Adapted from DB `CrossordPuzzle` at the page/API boundary.
 */

export type CrossWordCell = string | null;
export type CrossWordDirection = 'across' | 'down';

export type CrossWordEntry = {
  id: string;
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: CrossWordDirection;
};

export type CrossWordGamePuzzle = {
  id: number;
  title: string;
  description: string;
  dimensions: [number, number];
  grid: CrossWordCell[][];
  entries: CrossWordEntry[];
};

export type CellPosition = { row: number; col: number };

export type NumberedEntry = CrossWordEntry & {
  number: number;
};

export function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function getEntryCells(
  entry: Pick<CrossWordEntry, 'row' | 'col' | 'direction' | 'answer'>
): CellPosition[] {
  return Array.from({ length: entry.answer.length }, (_, i) =>
    entry.direction === 'across'
      ? { row: entry.row, col: entry.col + i }
      : { row: entry.row + i, col: entry.col }
  );
}

/** Assign clue numbers by start coordinate (row-major). */
export function numberEntries(entries: CrossWordEntry[]): NumberedEntry[] {
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

export function createEmptyPlayerGrid(grid: CrossWordCell[][]): (string | null)[][] {
  return grid.map((row) =>
    row.map((cell) => {
      if (cell === null) return null;
      if (cell === '') return '';
      return cell;
    })
  );
}

export function isEditableCell(template: CrossWordCell) {
  return template === '';
}

export function isBlockedCell(template: CrossWordCell) {
  return template === null;
}

export function isFixedCell(template: CrossWordCell) {
  return typeof template === 'string' && template.length === 1;
}

export function getCellLetter(
  playerGrid: (string | null)[][],
  template: CrossWordCell[][],
  row: number,
  col: number
): string {
  const fixed = template[row]?.[col];
  if (fixed === null || fixed === undefined) return '';
  if (fixed !== '') return fixed;
  return playerGrid[row]?.[col] ?? '';
}

export function composeEntryAnswer(
  entry: CrossWordEntry,
  playerGrid: (string | null)[][],
  template: CrossWordCell[][]
): string {
  return getEntryCells(entry)
    .map(({ row, col }) => getCellLetter(playerGrid, template, row, col))
    .join('');
}

export function isEntryFilled(
  entry: CrossWordEntry,
  playerGrid: (string | null)[][],
  template: CrossWordCell[][]
) {
  return getEntryCells(entry).every(
    ({ row, col }) => getCellLetter(playerGrid, template, row, col) !== ''
  );
}

export function isEntryCorrect(
  entry: CrossWordEntry,
  playerGrid: (string | null)[][],
  template: CrossWordCell[][]
) {
  return composeEntryAnswer(entry, playerGrid, template) === entry.answer;
}

export function findEntriesAtCell(entries: CrossWordEntry[], row: number, col: number) {
  return entries.filter((entry) =>
    getEntryCells(entry).some((cell) => cell.row === row && cell.col === col)
  );
}

/** Next non-blocked, non-prefilled cell in a cardinal direction (for arrow keys). */
export function nextPlayableCell(
  template: CrossWordCell[][],
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
  entry: CrossWordEntry,
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
