import { describe, expect, it } from 'vitest';
import { REDIS_CACHE_KEYS, redis_generation_key } from './redis';

describe('REDIS_CACHE_KEYS crossword isolation', () => {
  it('uses crossword: prefix and no word_meanings key', () => {
    expect(REDIS_CACHE_KEYS.crossword_current_schedule()).toBe('crossword:current_schedule');
    expect(REDIS_CACHE_KEYS.crossword_next_schedule()).toBe('crossword:next_schedule');
    expect(REDIS_CACHE_KEYS.crossword_word_puzzle('abc')).toBe('crossword:word_puzzle:abc');
    expect(REDIS_CACHE_KEYS.crossword_listed_puzzle_list()).toBe('crossword:listed_puzzle_list');

    expect(REDIS_CACHE_KEYS).not.toHaveProperty('crossword_word_meanings');
    expect(Object.keys(REDIS_CACHE_KEYS).filter((k) => k.startsWith('crossword_'))).toEqual([
      'crossword_current_schedule',
      'crossword_next_schedule',
      'crossword_word_puzzle',
      'crossword_listed_puzzle_list'
    ]);
  });

  it('keeps padavali keys on a separate prefix', () => {
    expect(REDIS_CACHE_KEYS.padavali_current_schedule()).toBe('padavali:current_schedule');
    expect(REDIS_CACHE_KEYS.padavali_word_meanings('abc')).toBe('padavali:word_meanings:abc');
  });

  it('derives generation keys with :gen suffix', () => {
    expect(redis_generation_key(REDIS_CACHE_KEYS.padavali_word_meanings('abc'))).toBe(
      'padavali:word_meanings:abc:gen'
    );
  });
});
