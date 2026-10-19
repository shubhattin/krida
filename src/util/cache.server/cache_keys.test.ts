import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { RedisJsonValue } from '~/effect/redis';
import { padajalaCacheKeys } from '~/util/cache.server/padajala_cache';
import { padavaliCacheKeys } from '~/util/cache.server/padavali_cache';
import { puzzleSlugMapCacheKeys } from '~/util/cache.server/puzzle_slug_map_cache';
import { sitemapCacheKeys } from '~/util/cache.server/sitemap_cache';
import { simpleGameCacheKeys } from '~/util/cache.server/simple_game_cache';

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
  it('uses padavali and padajala prefixes without version segments', () => {
    expect(padavaliCacheKeys.current_schedule()).toBe('padavali:current_schedule');
    expect(padavaliCacheKeys.word_meanings('abc')).toBe('padavali:word_meanings:abc');
    expect(padajalaCacheKeys.word_puzzle('xyz')).toBe('padajala:word_puzzle:xyz');
    expect(padajalaCacheKeys.more_hints('xyz')).toBe('padajala:puzzle_more_hints:xyz');
    expect(padajalaCacheKeys).not.toHaveProperty('word_meanings');
  });

  it('uses simple-game prefixes for listed lists and word puzzles', () => {
    expect(simpleGameCacheKeys('dvayi').listed_puzzle_list()).toBe('dvayi:listed_puzzle_list');
    expect(simpleGameCacheKeys('dvayi').word_puzzle('abc')).toBe('dvayi:word_puzzle:abc');
    expect(simpleGameCacheKeys('bhramita').word_puzzle('xyz')).toBe('bhramita:word_puzzle:xyz');
    expect(simpleGameCacheKeys('surupa').listed_puzzle_list()).toBe('surupa:listed_puzzle_list');
    expect(simpleGameCacheKeys('anveshi').word_puzzle('mcq')).toBe('anveshi:word_puzzle:mcq');
  });

  it('uses a single key for the cross-game puzzle slug map', () => {
    expect(puzzleSlugMapCacheKeys.slug_map()).toBe('puzzle:slug_map');
  });

  it('uses sitemap keys for padavali and padajala', () => {
    expect(sitemapCacheKeys.padavali()).toBe('sitemap:padavali');
    expect(sitemapCacheKeys.padajala()).toBe('sitemap:padajala');
  });

  it('derives generation keys with :gen suffix', () => {
    expect(redisGenerationKey(padavaliCacheKeys.word_meanings('abc'))).toBe(
      'padavali:word_meanings:abc:gen'
    );
    expect(redisGenerationKey(padajalaCacheKeys.more_hints('abc'))).toBe(
      'padajala:puzzle_more_hints:abc:gen'
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
