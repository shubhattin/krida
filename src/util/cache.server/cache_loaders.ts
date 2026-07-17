import { CachedLoader } from './create_cached_loader';
import { PadavaliCacheLoaders, padavali_cache_loaders } from './padavali_cache';
import { CrosswordCacheLoaders, crossword_cache_loaders } from './crossword_cache';

export { NO_CACHE_PARAMS } from './create_cached_loader';

/** Await cache delete, then warm cache in background (prod only, via waitUntil). */
export const invalidate_and_refresh_cached = async <TParams, TData>(
  loader: CachedLoader<TParams, TData>,
  params: TParams
) => {
  await loader.delete(params);
  void loader.refresh(params, { deleteFirst: false });
};

export type CacheLoaderRegistry = {
  padavali: PadavaliCacheLoaders;
  crossword: CrosswordCacheLoaders;
};

export const CACHE = {
  padavali: padavali_cache_loaders,
  crossword: crossword_cache_loaders
} as CacheLoaderRegistry;
