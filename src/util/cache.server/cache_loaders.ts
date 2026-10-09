import type { CrosswordCacheLoaders } from './crossword_cache';
import { crossword_cache_loaders } from './crossword_cache';
import type { PadavaliCacheLoaders } from './padavali_cache';
import { padavali_cache_loaders } from './padavali_cache';
import type { SitemapCacheLoaders } from './sitemap_cache';
import { sitemap_cache_loaders } from './sitemap_cache';
import type { UserCacheLoaders } from './user_cache';
import { user_cache_loaders } from './user_cache';
import type { CollectionCacheLoaders } from './collection_cache';
import { collection_cache_loaders } from './collection_cache';
import { dvayi_cache_loaders } from './dvayi_cache';
import { bhramita_cache_loaders } from './bhramita_cache';
import { surupa_cache_loaders } from './surupa_cache';
import { anveshi_cache_loaders } from './anveshi_cache';
import type { SimpleGameCacheLoaders } from './simple_game_cache';
import type { DvayiPuzzleData } from '~/util/dvayi/data';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import type { SurupaPuzzleData } from '~/util/surupa/data';
import type { AnveshiPuzzleData } from '~/util/anveshi/data';

export {
  NO_CACHE_PARAMS,
  invalidateAndRefreshCache as invalidate_and_refresh_cache
} from '~/effect/cache';

export { invalidate_padavali_sitemap, invalidate_padajala_sitemap } from './sitemap_cache';

/** Toggle Redis caching for AI word meanings / more hints outside production. */
export { CACHE_AI_OUTSIDE_PROD } from './ai_cache_options';

export type CacheLoaderRegistry = {
  padavali: PadavaliCacheLoaders;
  crossword: CrosswordCacheLoaders;
  dvayi: SimpleGameCacheLoaders<DvayiPuzzleData>;
  bhramita: SimpleGameCacheLoaders<BhramitaPuzzleData>;
  surupa: SimpleGameCacheLoaders<SurupaPuzzleData>;
  anveshi: SimpleGameCacheLoaders<AnveshiPuzzleData>;
  user: UserCacheLoaders;
  sitemap: SitemapCacheLoaders;
  catalog: CollectionCacheLoaders;
};

export const CACHE: CacheLoaderRegistry = {
  padavali: padavali_cache_loaders,
  crossword: crossword_cache_loaders,
  dvayi: dvayi_cache_loaders,
  bhramita: bhramita_cache_loaders,
  surupa: surupa_cache_loaders,
  anveshi: anveshi_cache_loaders,
  user: user_cache_loaders,
  sitemap: sitemap_cache_loaders,
  catalog: collection_cache_loaders
};
