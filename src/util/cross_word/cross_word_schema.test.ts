import { describe, expect, it } from 'vitest';
import {
  composeEntryAnswer,
  createEmptyPlayerGrid,
  crossWordPuzzleSchema,
  getEntryCells,
  isEntryCorrect,
  nextPlayableCell,
  numberEntries
} from './cross_word_schema';
import { NAMES_OF_SHIVA_PUZZLE } from './example_shiva_puzzle';

describe('crossWordPuzzleSchema', () => {
  it('accepts the Names of Shiva example', () => {
    const puzzle = crossWordPuzzleSchema.parse(NAMES_OF_SHIVA_PUZZLE);
    expect(puzzle.dimensions).toEqual([6, 6]);
    expect(puzzle.entries).toHaveLength(5);
  });

  it('rejects non-rectangular grids', () => {
    const result = crossWordPuzzleSchema.safeParse({
      ...NAMES_OF_SHIVA_PUZZLE,
      dimensions: [2, 6],
      grid: [
        ['', '', '', '', '', null],
        [null, '']
      ]
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(['grid', 1]);
    expect(result.error.issues[0]?.message).toMatch(/Row 1 must have 6 columns/);
  });

  it('rejects out-of-bounds placements', () => {
    const result = crossWordPuzzleSchema.safeParse({
      ...NAMES_OF_SHIVA_PUZZLE,
      entries: [
        {
          id: 'bad',
          answer: 'SHIVA',
          clue: 'test',
          row: 0,
          col: 4,
          direction: 'across'
        }
      ]
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === 'entries')).toBe(true);
    expect(result.error.issues.some((issue) => issue.message.includes('out of bounds'))).toBe(true);
  });

  it('rejects crossing conflicts', () => {
    const result = crossWordPuzzleSchema.safeParse({
      id: 'conflict',
      title: 'Conflict',
      description: 'Bad crossings',
      dimensions: [3, 3],
      grid: [
        ['', '', ''],
        ['', null, null],
        ['', null, null]
      ],
      entries: [
        { id: 'a', answer: 'ABC', clue: 'A', row: 0, col: 0, direction: 'across' },
        { id: 'b', answer: 'XY', clue: 'B', row: 0, col: 0, direction: 'down' }
      ]
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.join('.') === 'grid.0.0')).toBe(true);
    expect(result.error.issues.some((issue) => issue.message.includes('Crossing conflict'))).toBe(
      true
    );
  });
});

describe('game helpers', () => {
  const puzzle = crossWordPuzzleSchema.parse(NAMES_OF_SHIVA_PUZZLE);

  it('numbers entries by start cell', () => {
    const numbered = numberEntries(puzzle.entries);
    const byId = Object.fromEntries(numbered.map((e) => [e.id, e.number]));
    expect(byId.shiva).toBe(1);
    expect(byId.hara).toBe(2);
    expect(byId.rudra).toBe(3);
    expect(byId.deva).toBe(4);
    expect(byId.ugra).toBe(5);
  });

  it('composes and validates entry answers', () => {
    const player = createEmptyPlayerGrid(puzzle.grid);
    const shiva = puzzle.entries.find((e) => e.id === 'shiva')!;

    // Seed player letters for empty cells of SHIVA
    for (const { row, col } of getEntryCells(shiva)) {
      if (puzzle.grid[row]![col] === '') {
        player[row]![col] =
          shiva.answer[getEntryCells(shiva).findIndex((c) => c.row === row && c.col === col)]!;
      }
    }

    expect(composeEntryAnswer(shiva, player, puzzle.grid)).toBe('SHIVA');
    expect(isEntryCorrect(shiva, player, puzzle.grid)).toBe(true);
  });

  it('skips blocked cells when navigating', () => {
    // Down from (0,0): (1,0)–(4,0) blocked → lands on UGRA start (5,0)
    expect(nextPlayableCell(puzzle.grid, 0, 0, 1, 0)).toEqual({ row: 5, col: 0 });
    // Right from (0,0) stays on SHIVA
    expect(nextPlayableCell(puzzle.grid, 0, 0, 0, 1)).toEqual({ row: 0, col: 1 });
  });
});
