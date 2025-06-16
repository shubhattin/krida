import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export const REDIS_CACHE_KEYS = {
  current_schedule: () => 'current_schedule',
  next_schedule: () => 'next_schedule',
  word_puzzle: (id: number) => `word_puzzle:${id}`,
  archived_puzzle_list: () => 'archived_puzzle_list'
};
