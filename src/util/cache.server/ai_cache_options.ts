/**
 * Redis-cache AI results (padavali word meanings, padajala more hints) even outside
 * production. Production always caches regardless of this flag.
 *
 * The output itself is persisted in Postgres either way, so turning this off does not
 * re-hit the model; to iterate on a prompt, bump its PROMPT_VERSION or use the admin
 * Regenerate action. Default `true` keeps the single-flight lock and failure backoff in dev.
 */
export const CACHE_AI_OUTSIDE_PROD = true;

/** After an AI generation fails, serve an error for this long instead of regenerating (paid). */
export const AI_FAILURE_TTL_SECONDS = 15 * 60;
