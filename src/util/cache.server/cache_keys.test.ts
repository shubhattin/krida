import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/** Mirrors padavali/crossword v2 key builders used by Effect createCache loaders. */
const padavaliKeys = {
  current_schedule: () => 'padavali:v2:current_schedule',
  next_schedule: () => 'padavali:v2:next_schedule',
  listed_puzzle_list: () => 'padavali:v2:listed_puzzle_list',
  word_puzzle: (slug: string) => `padavali:v2:word_puzzle:${slug}`,
  word_meanings: (slug: string) => `padavali:v2:word_meanings:${slug}`
};

const crosswordKeys = {
  current_schedule: () => 'crossword:v2:current_schedule',
  next_schedule: () => 'crossword:v2:next_schedule',
  listed_puzzle_list: () => 'crossword:v2:listed_puzzle_list',
  word_puzzle: (slug: string) => `crossword:v2:word_puzzle:${slug}`,
  more_hints: (slug: string) => `crossword:v2:more_hints:${slug}`
};

const redisGenerationKey = (cacheKey: string) => `${cacheKey}:gen`;

const parseScheduleSentinel =
  <T>(schema: z.ZodType<T>) =>
  (raw: unknown): T | undefined | null => {
    if (raw === 'undefined') return undefined;
    if (typeof raw === 'object' && raw !== null) return schema.parse(raw);
    return null;
  };

describe('cache v2 keys', () => {
  it('uses padavali:v2 and crossword:v2 prefixes', () => {
    expect(padavaliKeys.current_schedule()).toBe('padavali:v2:current_schedule');
    expect(padavaliKeys.word_meanings('abc')).toBe('padavali:v2:word_meanings:abc');
    expect(crosswordKeys.word_puzzle('xyz')).toBe('crossword:v2:word_puzzle:xyz');
    expect(crosswordKeys.more_hints('xyz')).toBe('crossword:v2:more_hints:xyz');
    expect(crosswordKeys).not.toHaveProperty('word_meanings');
  });

  it('derives generation keys with :gen suffix', () => {
    expect(redisGenerationKey(padavaliKeys.word_meanings('abc'))).toBe(
      'padavali:v2:word_meanings:abc:gen'
    );
    expect(redisGenerationKey(crosswordKeys.more_hints('abc'))).toBe(
      'crossword:v2:more_hints:abc:gen'
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
