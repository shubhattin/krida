/**
 * Redis-cache AI results (padavali word meanings, crossword more hints) even outside
 * production. Production always caches regardless of this flag.
 *
 * Set to `false` while iterating on AI prompts so every request hits the model.
 * Default `true` — without this, local/dev skips Redis and calls the AI API every time.
 */
export const CACHE_AI_OUTSIDE_PROD = true;
