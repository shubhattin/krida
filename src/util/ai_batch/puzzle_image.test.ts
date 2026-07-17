import { describe, expect, it } from 'vitest';
import {
  getPuzzleImageBatchCustomId,
  parsePuzzleIdFromBatchCustomId
} from './puzzle_image';

describe('getPuzzleImageBatchCustomId', () => {
  it('keeps padavali historical prefix by default', () => {
    expect(getPuzzleImageBatchCustomId(12)).toBe('puzzle-image-12');
    expect(getPuzzleImageBatchCustomId(12, 'padavali')).toBe('puzzle-image-12');
  });

  it('namespaces crossword ids', () => {
    expect(getPuzzleImageBatchCustomId(7, 'crossword')).toBe('crossword-puzzle-image-7');
  });
});

describe('parsePuzzleIdFromBatchCustomId', () => {
  it('parses padavali and crossword namespaces', () => {
    expect(parsePuzzleIdFromBatchCustomId('puzzle-image-42')).toEqual({
      puzzle_id: 42,
      game: 'padavali'
    });
    expect(parsePuzzleIdFromBatchCustomId('crossword-puzzle-image-9')).toEqual({
      puzzle_id: 9,
      game: 'crossword'
    });
  });

  it('returns null for unknown prefixes', () => {
    expect(parsePuzzleIdFromBatchCustomId('other-image-1')).toBeNull();
  });
});
