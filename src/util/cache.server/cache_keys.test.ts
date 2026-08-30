import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { RedisJsonValue } from '~/effect/redis';
import { crosswordCacheKeys } from '~/util/cache.server/crossword_cache';
import { padavaliCacheKeys } from '~/util/cache.server/padavali_cache';

const redisGenerationKey = (cacheKey: string) => `${cacheKey}:gen`;

const parseScheduleSentinel =
  <T>(schema: z.ZodType<T>) =>
  (raw: RedisJsonValue): T | undefined | null => {
    if (raw === 'undefined') return undefined;
    // Non-object payloads fail the object schema itself, mapping to a cache miss.
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  };

describe('cache keys', () => {
  it('uses padavali and crossword prefixes without version segments', () => {
    expect(padavaliCacheKeys.current_schedule()).toBe('padavali:current_schedule');
    expect(padavaliCacheKeys.word_meanings('abc')).toBe('padavali:word_meanings:abc');
    expect(crosswordCacheKeys.word_puzzle('xyz')).toBe('crossword:word_puzzle:xyz');
    expect(crosswordCacheKeys.more_hints('xyz')).toBe('crossword:puzzle_more_hints:xyz');
    expect(crosswordCacheKeys).not.toHaveProperty('word_meanings');
  });

  it('derives generation keys with :gen suffix', () => {
    expect(redisGenerationKey(padavaliCacheKeys.word_meanings('abc'))).toBe(
      'padavali:word_meanings:abc:gen'
    );
    expect(redisGenerationKey(crosswordCacheKeys.more_hints('abc'))).toBe(
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
