import { describe, expect, it } from 'vitest';
import {
  escapeIlikeToken,
  matchesPuzzleWordSearch,
  matchesWordSearch,
  tokenizeSearchQuery
} from './search';

describe('tokenizeSearchQuery', () => {
  it('splits on whitespace and lowercases', () => {
    expect(tokenizeSearchQuery('  Ganesh   Mumbai  ')).toEqual(['ganesh', 'mumbai']);
  });

  it('returns empty array for blank query', () => {
    expect(tokenizeSearchQuery('   ')).toEqual([]);
  });
});

describe('escapeIlikeToken', () => {
  it('escapes ilike metacharacters', () => {
    expect(escapeIlikeToken('100%_done')).toBe('100\\%\\_done');
  });
});

describe('matchesWordSearch', () => {
  it('matches when all tokens appear in one field', () => {
    expect(matchesWordSearch(['ganesh of mumbai'], 'ganesh mumbai')).toBe(true);
  });

  it('does not require contiguous phrase match', () => {
    expect('ganesh of mumbai'.includes('ganesh mumbai')).toBe(false);
    expect(matchesWordSearch(['ganesh of mumbai'], 'ganesh mumbai')).toBe(true);
  });

  it('matches tokens spread across multiple fields', () => {
    expect(matchesWordSearch(['ganesh puzzle', null, 'set in mumbai'], 'ganesh mumbai')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(matchesWordSearch(['Ganesh OF Mumbai'], 'GANESH mumbai')).toBe(true);
  });

  it('requires every token to match', () => {
    expect(matchesWordSearch(['ganesh of mumbai'], 'ganesh delhi')).toBe(false);
    expect(matchesWordSearch(['mumbai'], 'ganesh mumbai')).toBe(false);
  });

  it('returns true for empty query', () => {
    expect(matchesWordSearch(['anything'], '')).toBe(true);
    expect(matchesWordSearch(['anything'], '   ')).toBe(true);
  });

  it('returns false when fields are empty but query has tokens', () => {
    expect(matchesWordSearch([null, undefined, ''], 'ganesh')).toBe(false);
  });
});

describe('matchesPuzzleWordSearch', () => {
  const puzzle = {
    title: 'गणेश पहेली',
    title_normal: 'ganesh of mumbai',
    description: 'transliterated desc',
    description_original: 'original in devanagari'
  };

  it('matches transliterated title tokens', () => {
    expect(matchesPuzzleWordSearch({ ...puzzle, title: 'mumbai special' }, 'mumbai')).toBe(true);
  });

  it('matches normal title tokens', () => {
    expect(matchesPuzzleWordSearch(puzzle, 'ganesh mumbai')).toBe(true);
  });

  it('matches description tokens', () => {
    expect(matchesPuzzleWordSearch(puzzle, 'transliterated')).toBe(true);
    expect(matchesPuzzleWordSearch(puzzle, 'devanagari')).toBe(true);
  });

  it('matches when tokens come from different puzzle fields', () => {
    expect(
      matchesPuzzleWordSearch(
        {
          title: 'puzzle one',
          title_normal: 'ganesh',
          description: '',
          description_original: 'located in mumbai'
        },
        'ganesh mumbai'
      )
    ).toBe(true);
  });
});
