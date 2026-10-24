import { describe, expect, it } from 'vitest';
import { batch_metadata_schema } from '~/util/types/ai_batch_metadata';
import { getPuzzleImageBatchCustomId, parsePuzzleIdFromBatchCustomId } from './puzzle_image';

describe('getPuzzleImageBatchCustomId', () => {
  it('keeps padavali historical prefix by default', () => {
    expect(getPuzzleImageBatchCustomId(12)).toBe('puzzle-image-12');
    expect(getPuzzleImageBatchCustomId(12, 'padavali')).toBe('puzzle-image-12');
  });

  it('namespaces padajala ids', () => {
    expect(getPuzzleImageBatchCustomId(7, 'padajala')).toBe('padajala-puzzle-image-7');
  });
});

describe('parsePuzzleIdFromBatchCustomId', () => {
  it('parses padavali and padajala namespaces', () => {
    expect(parsePuzzleIdFromBatchCustomId('puzzle-image-42')).toEqual({
      puzzle_id: 42,
      game: 'padavali'
    });
    expect(parsePuzzleIdFromBatchCustomId('padajala-puzzle-image-9')).toEqual({
      puzzle_id: 9,
      game: 'padajala'
    });
  });

  it('returns null for unknown prefixes', () => {
    expect(parsePuzzleIdFromBatchCustomId('other-image-1')).toBeNull();
  });
});

describe('new kridas', () => {
  it('round-trips custom ids for every simple game', () => {
    for (const game of ['dvayi', 'bhramita', 'surupa', 'anveshi'] as const) {
      const custom_id = getPuzzleImageBatchCustomId(31, game);
      expect(custom_id).toBe(`${game}-puzzle-image-31`);
      expect(parsePuzzleIdFromBatchCustomId(custom_id)).toEqual({ puzzle_id: 31, game });
    }
  });

  it('does not confuse padavali ids with new-game ids', () => {
    expect(parsePuzzleIdFromBatchCustomId('dvayi-puzzle-image-3')?.game).toBe('dvayi');
    expect(parsePuzzleIdFromBatchCustomId('puzzle-image-3')?.game).toBe('padavali');
  });

  it('accepts krida-puzzle-image metadata and rejects a mismatched game', () => {
    const base = {
      puzzle_id: 5,
      image_prompt: 'p',
      file_name: 'f',
      image_description: 'd'
    };
    expect(
      batch_metadata_schema.parse({ ...base, type: 'krida-puzzle-image', game: 'surupa' }).game
    ).toBe('surupa');
    expect(
      batch_metadata_schema.safeParse({ ...base, type: 'krida-puzzle-image', game: 'padavali' })
        .success
    ).toBe(false);
  });
});
