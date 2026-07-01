import { describe, expect, it } from 'vitest';
import { isValidSlug, normalizeSlug, parseIdSlugParam } from './slug';

describe('normalizeSlug', () => {
  it('trims and lowercases', () => {
    expect(normalizeSlug('  My-Puzzle_1  ')).toBe('my-puzzle_1');
  });
});

describe('isValidSlug', () => {
  it('accepts valid slugs', () => {
    expect(isValidSlug('my-puzzle_1')).toBe(true);
    expect(isValidSlug('abc123')).toBe(true);
  });

  it('rejects slugs over max length', () => {
    expect(isValidSlug('a'.repeat(101))).toBe(false);
    expect(isValidSlug('a'.repeat(100))).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('has space')).toBe(false);
    expect(isValidSlug('has:colon')).toBe(false);
    expect(isValidSlug('UPPER')).toBe(false);
    expect(isValidSlug('special!')).toBe(false);
  });

  it('rejects reserved route slugs', () => {
    expect(isValidSlug('puzzles')).toBe(false);
    expect(isValidSlug('view')).toBe(false);
    expect(isValidSlug('puzzle')).toBe(false);
  });
});

describe('parseIdSlugParam', () => {
  it('parses id and slug from first colon', () => {
    expect(parseIdSlugParam('42:my-puzzle')).toEqual({ id: 42, slug: 'my-puzzle' });
  });

  it('decodes URI components', () => {
    expect(parseIdSlugParam(encodeURIComponent('7:hello-world'))).toEqual({
      id: 7,
      slug: 'hello-world'
    });
  });

  it('returns null for malformed percent-encoding', () => {
    expect(parseIdSlugParam('%E0%A4%A')).toBeNull();
  });

  it('returns null for malformed params', () => {
    expect(parseIdSlugParam('no-colon')).toBeNull();
    expect(parseIdSlugParam('42:')).toBeNull();
    expect(parseIdSlugParam(':slug-only')).toBeNull();
    expect(parseIdSlugParam('0:slug')).toBeNull();
    expect(parseIdSlugParam('abc:slug')).toBeNull();
  });
});
