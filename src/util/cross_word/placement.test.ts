import { describe, expect, it } from 'vitest';
import {
  createEmptyGridData,
  createEmptyCell,
  createLetterCell,
  normalizeAlphaLetter,
  clampDimension,
  CROSSWORD_MIN_DIM,
  CROSSWORD_MAX_DIM
} from './grid';
import { analyzeWordPlacements, findAllRuns, findPlacementsForWord } from './placement';
import { toCrossWordGamePuzzle, gridCellToGameCell } from './adapter';
import { numberEntries, createEmptyPlayerGrid, isFixedCell, isBlockedCell } from './game_model';
import type { CrossordPuzzle } from '~/db/schema_zod';

describe('grid helpers', () => {
  it('createEmptyGridData fills blocked box cells', () => {
    const grid = createEmptyGridData([3, 4]);
    expect(grid).toHaveLength(3);
    expect(grid[0]).toHaveLength(4);
    expect(grid[0]![0]).toEqual({ text: '', is_visible: false });
  });

  it('normalizeAlphaLetter overwrites with last letter and uppercases', () => {
    expect(normalizeAlphaLetter('a')).toBe('A');
    expect(normalizeAlphaLetter('Ab')).toBe('B');
    expect(normalizeAlphaLetter('1x2')).toBe('X');
    expect(normalizeAlphaLetter('')).toBe('');
  });

  it('clampDimension respects bounds', () => {
    expect(clampDimension(1)).toBe(CROSSWORD_MIN_DIM);
    expect(clampDimension(100)).toBe(CROSSWORD_MAX_DIM);
    expect(clampDimension(10)).toBe(10);
  });
});

describe('placement analysis', () => {
  const letter = (ch: string, visible = false) => createLetterCell(ch, visible);
  const box = () => createEmptyCell();

  it('finds horizontal and vertical runs', () => {
    const grid = [
      [letter('C'), letter('A'), letter('T'), box()],
      [letter('A'), box(), box(), box()],
      [letter('R'), box(), box(), box()]
    ];
    const runs = findAllRuns(grid);
    expect(runs.some((r) => r.direction === 'horizontal' && r.cells.length === 3)).toBe(true);
    expect(runs.some((r) => r.direction === 'vertical' && r.cells.length === 3)).toBe(true);
  });

  it('unique placement resolves ok', () => {
    const grid = [
      [letter('C', true), letter('A'), letter('T')],
      [box(), box(), box()],
      [box(), box(), box()]
    ];
    const analysis = analyzeWordPlacements(grid, [{ word: 'CAT', description: 'feline' }]);
    expect(analysis.hasAllValid).toBe(true);
    expect(analysis.canList).toBe(true);
    expect(analysis.noVisibleHintWords).toHaveLength(0);
    expect(analysis.resolvedWordList[0]).toMatchObject({
      word: 'CAT',
      location: [0, 0],
      direction: 'horizontal'
    });
    expect(analysis.occupiedCells.has('0,0')).toBe(true);
  });

  it('warns when found word has no visible letter', () => {
    const grid = [
      [letter('C'), letter('A'), letter('T')],
      [box(), box(), box()],
      [box(), box(), box()]
    ];
    const analysis = analyzeWordPlacements(grid, [{ word: 'CAT' }]);
    expect(analysis.statuses[0]?.status).toBe('ok');
    expect(analysis.noVisibleHintWords).toEqual([{ wordIndex: 0, word: 'CAT' }]);
    expect(analysis.canList).toBe(true);
  });

  it('finds word bounded by empty (box) cells', () => {
    // Blank text cells break runs — only filled letters count
    const grid = [
      [box(), letter('A'), letter('H'), letter('I'), letter('M'), letter('S'), letter('A'), box()]
    ];
    const analysis = analyzeWordPlacements(grid, [{ word: 'AHIMSA' }]);
    expect(analysis.statuses[0]?.status).toBe('ok');
    expect(analysis.resolvedWordList[0]).toMatchObject({
      word: 'AHIMSA',
      location: [0, 1],
      direction: 'horizontal'
    });
  });

  it('missing word status', () => {
    const grid = createEmptyGridData([3, 3]);
    const analysis = analyzeWordPlacements(grid, [{ word: 'DOG' }]);
    expect(analysis.statuses[0]?.status).toBe('missing');
    expect(analysis.canList).toBe(false);
  });

  it('ambiguous paths require disambiguation', () => {
    const grid = [
      [letter('A'), letter('B'), box(), letter('A'), letter('B')],
      [box(), box(), box(), box(), box()],
      [box(), box(), box(), box(), box()]
    ];
    const placements = findPlacementsForWord(grid, 'AB');
    expect(placements.length).toBe(2);
    const analysis = analyzeWordPlacements(grid, [{ word: 'AB' }]);
    expect(analysis.statuses[0]?.status).toBe('ambiguous');
    expect(analysis.canList).toBe(false);
  });

  it('duplicate word list entries', () => {
    const grid = [[letter('H'), letter('I')]];
    const analysis = analyzeWordPlacements(grid, [{ word: 'HI' }, { word: 'HI' }]);
    expect(analysis.statuses[0]?.status).toBe('duplicate');
    expect(analysis.canList).toBe(false);
  });
});

describe('adapter and game model', () => {
  it('gridCellToGameCell mapping', () => {
    expect(gridCellToGameCell({ text: '', is_visible: false })).toBeNull();
    expect(gridCellToGameCell({ text: 'S', is_visible: true })).toBe('S');
    expect(gridCellToGameCell({ text: 'H', is_visible: false })).toBe('');
  });

  it('toCrossWordGamePuzzle adapts DB puzzle', () => {
    const puzzle: CrossordPuzzle = {
      id: 1,
      slug: null,
      title: 'Test',
      description: 'Desc',
      grid_dimensions: [2, 3],
      grid_data: [
        [
          { text: 'C', is_visible: true },
          { text: 'A', is_visible: false },
          { text: 'T', is_visible: false }
        ],
        [
          { text: '', is_visible: false },
          { text: '', is_visible: false },
          { text: '', is_visible: false }
        ]
      ],
      word_list: [
        {
          word: 'CAT',
          location: [0, 0],
          direction: 'horizontal',
          description: 'feline'
        }
      ],
      listed: true,
      last_listed_at: null,
      created_at: new Date(),
      updated_at: undefined
    };

    const game = toCrossWordGamePuzzle(puzzle);
    expect(game.dimensions).toEqual([2, 3]);
    expect(game.grid[0]).toEqual(['C', '', '']);
    expect(isBlockedCell(game.grid[1]![0]!)).toBe(true);
    expect(isFixedCell(game.grid[0]![0]!)).toBe(true);
    expect(game.entries[0]).toMatchObject({
      answer: 'CAT',
      clue: 'feline',
      direction: 'across',
      row: 0,
      col: 0
    });

    const numbered = numberEntries(game.entries);
    expect(numbered[0]!.number).toBe(1);

    const player = createEmptyPlayerGrid(game.grid);
    expect(player[0]![0]).toBe('C');
    expect(player[0]![1]).toBe('');
    expect(player[1]![0]).toBeNull();
  });
});
