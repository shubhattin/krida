import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/** Mirrors padavali/crossword key builders used by Effect createCache loaders. */
const padavaliKeys = {
  current_schedule: () => 'padavali:current_schedule',
  next_schedule: () => 'padavali:next_schedule',
  listed_puzzle_list: () => 'padavali:listed_puzzle_list',
  word_puzzle: (slug: string) => `padavali:word_puzzle:${slug}`,
  word_meanings: (slug: string) => `padavali:word_meanings:${slug}`
};

const crosswordKeys = {
  current_schedule: () => 'crossword:current_schedule',
  next_schedule: () => 'crossword:next_schedule',
  listed_puzzle_list: () => 'crossword:listed_puzzle_list',
  word_puzzle: (slug: string) => `crossword:word_puzzle:${slug}`,
  more_hints: (slug: string) => `crossword:puzzle_more_hints:${slug}`
};

const redisGenerationKey = (cacheKey: string) => `${cacheKey}:gen`;

const parseScheduleSentinel =
  <T>(schema: z.ZodType<T>) =>
  (raw: unknown): T | undefined | null => {
    if (raw === 'undefined') return undefined;
    if (typeof raw === 'object' && raw !== null) {
      const parsed = schema.safeParse(raw);
      return parsed.success ? parsed.data : null;
    }
    return null;
  };

describe('cache keys', () => {
  it('uses padavali and crossword prefixes without version segments', () => {
    expect(padavaliKeys.current_schedule()).toBe('padavali:current_schedule');
    expect(padavaliKeys.word_meanings('abc')).toBe('padavali:word_meanings:abc');
    expect(crosswordKeys.word_puzzle('xyz')).toBe('crossword:word_puzzle:xyz');
    expect(crosswordKeys.more_hints('xyz')).toBe('crossword:puzzle_more_hints:xyz');
    expect(crosswordKeys).not.toHaveProperty('word_meanings');
  });

  it('derives generation keys with :gen suffix', () => {
    expect(redisGenerationKey(padavaliKeys.word_meanings('abc'))).toBe(
      'padavali:word_meanings:abc:gen'
    );
    expect(redisGenerationKey(crosswordKeys.more_hints('abc'))).toBe(
      'crossword:puzzle_more_hints:abc:gen'
    );
  });
});

describe('schedule sentinel codec', () => {
  const schema = z.object({
    id: z.number().int(),
    end_time: z.coerce.date()
  });
  const fromCacheValue = parseScheduleSentinel(schema);

  it('maps sentinel string to undefined', () => {
    expect(fromCacheValue('undefined')).toBeUndefined();
  });

  it('parses object payloads', () => {
    const parsed = fromCacheValue({ id: 1, end_time: '2026-01-01T00:00:00.000Z' });
    expect(parsed).toEqual({ id: 1, end_time: new Date('2026-01-01T00:00:00.000Z') });
  });

  it('treats unexpected shapes as cache miss', () => {
    expect(fromCacheValue(null)).toBeNull();
    expect(fromCacheValue('other')).toBeNull();
    expect(fromCacheValue(42)).toBeNull();
  });
});
