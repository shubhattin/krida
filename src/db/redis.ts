import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export const REDIS_CACHE_KEYS = {
  current_schedule: () => 'padavali:current_schedule',
  next_schedule: () => 'padavali:next_schedule',
  word_puzzle: (slug: string) => `padavali:word_puzzle:${slug}`,
  archived_puzzle_list: () => 'padavali:archived_puzzle_list'
};
