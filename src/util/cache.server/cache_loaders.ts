import type { CrosswordCacheLoaders } from './crossword_cache';
import { crossword_cache_loaders } from './crossword_cache';
import type { PadavaliCacheLoaders } from './padavali_cache';
import { padavali_cache_loaders } from './padavali_cache';

export {
  NO_CACHE_PARAMS,
  invalidateAndRefreshCache as invalidate_and_refresh_cache
} from '~/effect/cache';

/** Toggle Redis caching for AI word meanings / more hints outside production. */
export { CACHE_AI_OUTSIDE_PROD } from './ai_cache_options';

export type CacheLoaderRegistry = {
  padavali: PadavaliCacheLoaders;
  crossword: CrosswordCacheLoaders;
};

export const CACHE: CacheLoaderRegistry = {
  padavali: padavali_cache_loaders,
  crossword: crossword_cache_loaders
};
