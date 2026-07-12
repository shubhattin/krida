import { z } from 'zod';

export const CROSS_WORD_DEFAULT_SIZE = 6;
export const ASCII_LETTER_RE = /^[A-Za-z]$/;

export const crossWordCellSchema = z.union([
  z.null(),
  z.literal(''),
  z
    .string()
    .length(1)
    .regex(ASCII_LETTER_RE, 'Fixed cells must be a single A–Z letter')
    .transform((value) => value.toUpperCase())
]);

export const crossWordDirectionSchema = z.enum(['across', 'down']);

export const crossWordEntrySchema = z.object({
  id: z.string().min(1),
  answer: z
    .string()
    .min(2)
    .regex(/^[A-Za-z]+$/, 'Answers must be Latin letters only')
    .transform((value) => value.toUpperCase()),
  clue: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  direction: crossWordDirectionSchema
});

export const crossWordPuzzleSchema = z
  .object({
    id: z.union([z.string().min(1), z.number().int()]),
    title: z.string().min(1),
    description: z.string().min(1),
    dimensions: z
      .tuple([z.number().int().positive(), z.number().int().positive()])
      .default([CROSS_WORD_DEFAULT_SIZE, CROSS_WORD_DEFAULT_SIZE]),
    grid: z.array(z.array(crossWordCellSchema)).min(1),
    entries: z.array(crossWordEntrySchema).min(1)
  })
  .superRefine((puzzle, ctx) => {
    const [rows, cols] = puzzle.dimensions;

    if (puzzle.grid.length !== rows) {
      ctx.addIssue({
        code: 'custom',
        path: ['grid'],
        message: `Grid must have ${rows} rows`
      });
      return;
    }

    for (let r = 0; r < puzzle.grid.length; r++) {
      if (puzzle.grid[r]!.length !== cols) {
        ctx.addIssue({
          code: 'custom',
          path: ['grid', r],
          message: `Row ${r} must have ${cols} columns`
        });
        return;
      }
    }

    const entryIds = new Set<string>();
    const ownedCells = new Set<string>();

    for (const [index, entry] of puzzle.entries.entries()) {
      if (entryIds.has(entry.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['entries', index, 'id'],
          message: `Duplicate entry id "${entry.id}"`
        });
      }
      entryIds.add(entry.id);

      const cells = getEntryCells(entry);
      for (let i = 0; i < cells.length; i++) {
        const { row, col } = cells[i]!;
        if (row < 0 || col < 0 || row >= rows || col >= cols) {
          ctx.addIssue({
            code: 'custom',
            path: ['entries', index],
            message: `Entry "${entry.id}" goes out of bounds`
          });
          return;
        }

        const cell = puzzle.grid[row]![col]!;
        const key = cellKey(row, col);
        ownedCells.add(key);

        if (cell === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['entries', index],
            message: `Entry "${entry.id}" overlaps a blocked cell at (${row},${col})`
          });
          continue;
        }

        const expected = entry.answer[i]!;
        if (cell !== '' && cell !== expected) {
          ctx.addIssue({
            code: 'custom',
            path: ['entries', index],
            message: `Entry "${entry.id}" conflicts with fixed letter "${cell}" at (${row},${col})`
          });
        }
      }
    }

    // Crossing consistency: every playable cell must agree across all entries that cover it
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = puzzle.grid[r]![c]!;
        if (cell === null) continue;

        const covering = puzzle.entries.flatMap((entry) => {
          const cells = getEntryCells(entry);
          const idx = cells.findIndex((pos) => pos.row === r && pos.col === c);
          if (idx === -1) return [];
          return [{ entry, letter: entry.answer[idx]! }];
        });

        if (covering.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['grid', r, c],
            message: `Playable cell (${r},${c}) is not part of any entry`
          });
          continue;
        }

        const letters = new Set(covering.map((item) => item.letter));
        if (letters.size > 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['grid', r, c],
            message: `Crossing conflict at (${r},${c}): ${[...letters].join(', ')}`
          });
        }
      }
    }
  });

export type CrossWordCell = z.infer<typeof crossWordCellSchema>;
export type CrossWordDirection = z.infer<typeof crossWordDirectionSchema>;
export type CrossWordEntry = z.infer<typeof crossWordEntrySchema>;
export type CrossWordPuzzle = z.infer<typeof crossWordPuzzleSchema>;

export type CellPosition = { row: number; col: number };

export type NumberedEntry = CrossWordEntry & {
  number: number;
};

export function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function getEntryCells(entry: Pick<CrossWordEntry, 'row' | 'col' | 'direction' | 'answer'>): CellPosition[] {
  return Array.from({ length: entry.answer.length }, (_, i) =>
    entry.direction === 'across'
      ? { row: entry.row, col: entry.col + i }
      : { row: entry.row + i, col: entry.col }
  );
}

/** Assign clue numbers by start coordinate (row-major, then across before down at same cell). */
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
  return getEntryCells(entry).every(({ row, col }) => getCellLetter(playerGrid, template, row, col) !== '');
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

export function findEntryById(entries: CrossWordEntry[], id: string) {
  return entries.find((entry) => entry.id === id) ?? null;
}

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
    if (template[r]![c] !== null) {
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
