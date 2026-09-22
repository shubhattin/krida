import { describe, expect, it } from 'vitest';
import { isUidUniqueViolation, withUniqueUid } from './nano_id';

describe('isUidUniqueViolation', () => {
  it('matches padavali and crossword uid constraints', () => {
    expect(
      isUidUniqueViolation({
        code: '23505',
        constraint_name: 'padavali_puzzles_uid_unique'
      })
    ).toBe(true);
    expect(
      isUidUniqueViolation({
        code: '23505',
        constraint: 'crossword_puzzles_uid_unique'
      })
    ).toBe(true);
  });

  it('ignores other unique violations', () => {
    expect(
      isUidUniqueViolation({
        code: '23505',
        constraint_name: 'padavali_puzzles_slug_idx'
      })
    ).toBe(false);
    expect(
      isUidUniqueViolation({
        code: '23503',
        constraint_name: 'padavali_puzzles_uid_unique'
      })
    ).toBe(false);
  });

  it('reads fields copied onto an Error instance', () => {
    const error = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint_name: 'padavali_puzzles_uid_unique'
    });
    expect(isUidUniqueViolation(error)).toBe(true);
  });

  it('walks wrapped causes', () => {
    expect(
      isUidUniqueViolation({
        cause: { code: '23505', constraint_name: 'padavali_puzzles_uid_unique' }
      })
    ).toBe(true);
  });
});

describe('withUniqueUid', () => {
  it('skips an id the check already found', async () => {
    const ids = ['taken1', 'fresh1'];
    const result = await withUniqueUid({
      createId: () => ids.shift()!,
      isTaken: async (id) => id === 'taken1',
      attempt: async (id) => id
    });
    expect(result).toBe('fresh1');
  });

  it('retries a uid unique violation from the insert', async () => {
    const ids = ['clash1', 'fresh1'];
    const result = await withUniqueUid({
      createId: () => ids.shift()!,
      isTaken: async () => false,
      attempt: async (id) => {
        if (id === 'clash1') {
          throw { code: '23505', constraint_name: 'crossword_puzzles_uid_unique' };
        }
        return id;
      }
    });
    expect(result).toBe('fresh1');
  });

  it('does not retry a slug unique violation', async () => {
    await expect(
      withUniqueUid({
        createId: () => 'abc12',
        isTaken: async () => false,
        attempt: async () => {
          throw { code: '23505', constraint_name: 'padavali_puzzles_slug_idx' };
        }
      })
    ).rejects.toMatchObject({ constraint_name: 'padavali_puzzles_slug_idx' });
  });

  it('throws when every attempt collides', async () => {
    await expect(
      withUniqueUid({
        createId: () => 'abc12',
        isTaken: async () => true,
        attempt: async () => 'unused'
      })
    ).rejects.toThrow('Failed to allocate a unique uid');
  });
});
