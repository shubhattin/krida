import { describe, expect, it } from 'vitest';
import {
  padajala_slug_schema,
  isValidPadajalaSlug,
  isValidSlug,
  normalizeSlug,
  slug_schema
} from './slug';

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

describe('isValidPadajalaSlug', () => {
  it('accepts valid padajala slugs', () => {
    expect(isValidPadajalaSlug('daily-grid')).toBe(true);
  });

  it('rejects padajala reserved routes including puzzle and batch_manager', () => {
    expect(isValidPadajalaSlug('puzzle')).toBe(false);
    expect(isValidPadajalaSlug('puzzles')).toBe(false);
    expect(isValidPadajalaSlug('batch_manager')).toBe(false);
    expect(isValidPadajalaSlug('analytics')).toBe(false);
  });
});

describe('slug_schema', () => {
  it('normalizes before validating length', () => {
    const slug = 'a'.repeat(100);
    expect(slug_schema.parse(`  ${slug}  `)).toBe(slug);
  });

  it('rejects normalized slugs over max length', () => {
    const slug = 'a'.repeat(101);
    expect(() => slug_schema.parse(`  ${slug}  `)).toThrow();
  });
});

describe('padajala_slug_schema', () => {
  it('rejects reserved padajala route names after normalize', () => {
    expect(() => padajala_slug_schema.parse('  Batch_Manager  ')).toThrow();
  });
});
