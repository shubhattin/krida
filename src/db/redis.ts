import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export const REDIS_CACHE_KEYS = {
  padavali_current_schedule: () => 'padavali:current_schedule',
  padavali_next_schedule: () => 'padavali:next_schedule',
  padavali_word_puzzle: (slug: string) => `padavali:word_puzzle:${slug}`,
  padavali_word_meanings: (slug: string) => `padavali:word_meanings:${slug}`,
  padavali_listed_puzzle_list: () => 'padavali:listed_puzzle_list'
};
