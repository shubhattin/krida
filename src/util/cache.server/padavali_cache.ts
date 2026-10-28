import { Effect } from 'effect';
import { and, asc, desc, eq, exists, gt, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { image_schema, puzzle_schema } from '~/db/db_shared_vals';
import {
  image_assets,
  padavali_puzzles,
  puzzle_attachments,
  puzzle_schedules,
  puzzles
} from '~/db/schema';
import { tagsForPuzzleIds } from '~/util/catalog/list_query';
import { createCache, type CacheItem, type NoCacheParams } from '~/effect/cache';
import { dbRunHttp } from '~/effect/database';
import type { RedisJsonValue } from '~/effect/redis';
import { CacheError } from '~/effect/errors';
import {
  get_puzzle_word_meanings,
  word_meanings_schema,
  WORD_MEANINGS_PROMPT_VERSION,
  type WordMeaningsType
} from '../ai/word_meanings';
import { wordMeaningsInputHash, type WordMeaningsInputs } from '../ai/ai_content_hash';
import { padavaliActiveWords, type PadavaliWordCandidate } from '~/util/puzzle/word_list';
import { createAiContentCache, type AiContentCache } from './ai_content_cache';
import { public_tag_schema } from '~/util/catalog/tags';
import {
  currentScheduleSetOptions,
  isNoLiveSchedule,
  nextScheduleStart,
  parseCurrentScheduleCache,
  type NoLiveSchedule
} from './schedule_cache_shared';

type PadavaliPuzzleType = z.infer<typeof puzzle_schema>;
export type { PadavaliPuzzleType };

type PadavaliDbPuzzle = Omit<PadavaliPuzzleType, 'word_list'> & {
  word_list: PadavaliWordCandidate[];
};

const toPublicPadavaliPuzzle = (puzzle: PadavaliDbPuzzle): PadavaliPuzzleType => ({
  ...puzzle,
  word_list: padavaliActiveWords(puzzle.word_list)
});

const current_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  puzzle: puzzle_schema
});

export type PadavaliCurrentScheduleType = z.infer<typeof current_schedule_schema> | undefined;

const next_schedule_schema = z.object({
  id: z.number().int(),
  start_time: z.coerce.date(),
  puzzle: z.object({
    id: z.number().int()
  })
});

export type PadavaliNextScheduleType = z.infer<typeof next_schedule_schema> | undefined;

const listed_puzzle_schema = z.object({
  id: z.number().int(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  image: image_schema.nullable(),
  tags: public_tag_schema.array(),
  /** Sort key: desc by last_listed_at, fallback to updated_at, then created_at. */
  last_listed_at: z.coerce.date().nullable().optional(),
  updated_at: z.coerce.date().nullable().optional(),
  created_at: z.coerce.date().nullable().optional()
});

export type PadavaliListedPuzzlesType = z.infer<typeof listed_puzzle_schema>[];

export type PadavaliPuzzleParams = { slug: string };

const CURRENT_SCHEDULE_KEY = 'padavali:current_schedule';
const NEXT_SCHEDULE_KEY = 'padavali:next_schedule';
const LISTED_PUZZLE_LIST_KEY = 'padavali:listed_puzzle_list';

const wordPuzzleKey = (slug: string) => `padavali:word_puzzle:${slug}`;
const wordMeaningsKey = (puzzle_id: number) =>
  `padavali:word_meanings:v${WORD_MEANINGS_PROMPT_VERSION}:${puzzle_id}`;
/** Pre-Postgres slug-keyed entry, read once per puzzle to avoid a repeat paid generation. */
const legacyWordMeaningsKey = (slug: string) => `padavali:word_meanings:${slug}`;

/** Exported for tests — must stay aligned with createCache getKey builders below. */
export const padavaliCacheKeys = {
  current_schedule: () => CURRENT_SCHEDULE_KEY,
  next_schedule: () => NEXT_SCHEDULE_KEY,
  listed_puzzle_list: () => LISTED_PUZZLE_LIST_KEY,
  word_puzzle: wordPuzzleKey,
  word_meanings: wordMeaningsKey,
  legacy_word_meanings: legacyWordMeaningsKey
} as const;

const toCacheError = (operation: string, key: string) => (cause: unknown) =>
  CacheError.make({ operation, key, cause });

const parseScheduleSentinel =
  <T>(schema: z.ZodType<T>) =>
  (raw: RedisJsonValue): T | undefined | null => {
    if (raw === 'undefined') return undefined;
    // Non-object payloads fail the object schema itself, mapping to a cache miss.
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  };

const load_current_schedule: CacheItem<NoCacheParams, PadavaliCurrentScheduleType> = createCache({
  getKey: () => CURRENT_SCHEDULE_KEY,
  fromCacheValue: parseCurrentScheduleCache(current_schedule_schema),
  transform: (data) => (isNoLiveSchedule(data) ? undefined : data),
  getSetOptions: currentScheduleSetOptions,
  // Visitors arriving as a puzzle starts all miss at once: one DB fetch, the rest wait for it.
  useSingleFlight: true,
  fetch: () => {
    const currentTime = new Date();
    return dbRunHttp('padavali.current_schedule', async (client) => {
      const [schedule] = await client
        .select({
          id: puzzle_schedules.id,
          start_time: puzzle_schedules.start_time,
          end_time: puzzle_schedules.end_time,
          puzzle_id: puzzles.id,
          slug: puzzles.slug,
          title: puzzles.title,
          created_at: puzzles.created_at,
          updated_at: puzzles.updated_at,
          listed: puzzles.listed,
          description: puzzles.description,
          word_list: padavali_puzzles.word_list,
          grid_data: padavali_puzzles.grid_data,
          grid_dimensions: padavali_puzzles.grid_dimensions,
          image_id: image_assets.id,
          image_s3_key: image_assets.s3_key,
          image_width: image_assets.width,
          image_height: image_assets.height
        })
        .from(puzzle_schedules)
        .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
        .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
        .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
        .where(
          and(
            eq(puzzles.kind, 'padavali'),
            lte(puzzle_schedules.start_time, currentTime),
            gte(puzzle_schedules.end_time, currentTime)
          )
        )
        .limit(1);
      if (!schedule) {
        const none: NoLiveSchedule = {
          none_until: await nextScheduleStart(client, 'padavali', currentTime)
        };
        return none;
      }

      const attachments = await client
        .select({
          id: puzzle_attachments.id,
          title: puzzle_attachments.title,
          type: puzzle_attachments.type,
          url: puzzle_attachments.url,
          order_index: puzzle_attachments.order_index
        })
        .from(puzzle_attachments)
        .where(eq(puzzle_attachments.puzzle_id, schedule.puzzle_id))
        .orderBy(asc(puzzle_attachments.order_index));

      // SAFETY: jsonb columns are stored as the padavali payload written by the editor.
      const dbPuzzle: PadavaliDbPuzzle = {
        id: schedule.puzzle_id,
        slug: schedule.slug,
        title: schedule.title,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
        listed: schedule.listed,
        description: schedule.description,
        word_list: schedule.word_list as PadavaliWordCandidate[],
        grid_data: schedule.grid_data as string[][],
        grid_dimensions: schedule.grid_dimensions as [number, number],
        attachments,
        image:
          schedule.image_id && schedule.image_s3_key
            ? {
                id: schedule.image_id,
                s3_key: schedule.image_s3_key,
                width: schedule.image_width!,
                height: schedule.image_height!
              }
            : null
      };

      return {
        id: schedule.id,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        puzzle: toPublicPadavaliPuzzle(dbPuzzle)
      };
    }).pipe(Effect.mapError(toCacheError('fetchCurrentSchedule', CURRENT_SCHEDULE_KEY)));
  }
});

const load_next_schedule: CacheItem<NoCacheParams, PadavaliNextScheduleType> = createCache({
  getKey: () => NEXT_SCHEDULE_KEY,
  schema: next_schedule_schema,
  toCacheValue: (data) => data ?? 'undefined',
  fromCacheValue: parseScheduleSentinel(next_schedule_schema),
  getSetOptions: (data) =>
    data ? { exat: Math.floor(data.start_time.getTime() / 1000) } : undefined,
  fetch: () => {
    const currentTime = new Date();
    return dbRunHttp('padavali.next_schedule', async (client) => {
      const [schedule] = await client
        .select({
          id: puzzle_schedules.id,
          start_time: puzzle_schedules.start_time,
          puzzle_id: puzzles.id
        })
        .from(puzzle_schedules)
        .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
        .where(and(eq(puzzles.kind, 'padavali'), gt(puzzle_schedules.start_time, currentTime)))
        .orderBy(puzzle_schedules.start_time)
        .limit(1);
      if (!schedule) return undefined;
      return {
        id: schedule.id,
        start_time: schedule.start_time,
        puzzle: { id: schedule.puzzle_id }
      };
    }).pipe(Effect.mapError(toCacheError('fetchNextSchedule', NEXT_SCHEDULE_KEY)));
  }
});

const load_listed_puzzle_list: CacheItem<NoCacheParams, PadavaliListedPuzzlesType> = createCache({
  getKey: () => LISTED_PUZZLE_LIST_KEY,
  schema: listed_puzzle_schema.array(),
  fetch: () =>
    dbRunHttp('padavali.listed_puzzle_list', (client) =>
      client
        .select({
          id: puzzles.id,
          slug: puzzles.slug,
          title: puzzles.title,
          description: puzzles.description,
          last_listed_at: puzzles.last_listed_at,
          updated_at: puzzles.updated_at,
          created_at: puzzles.created_at,
          image_id: image_assets.id,
          image_s3_key: image_assets.s3_key,
          image_width: image_assets.width,
          image_height: image_assets.height
        })
        .from(puzzles)
        .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
        .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
        .where(and(eq(puzzles.kind, 'padavali'), eq(puzzles.listed, true)))
        .orderBy(
          desc(
            sql`COALESCE(${puzzles.last_listed_at}, ${puzzles.updated_at}, ${puzzles.created_at})`
          ),
          desc(puzzles.created_at),
          desc(puzzles.id)
        )
    ).pipe(
      Effect.flatMap((rows) =>
        tagsForPuzzleIds(
          'padavali',
          rows.map((row) => row.id)
        ).pipe(
          Effect.map((tagsByPuzzle) =>
            rows.map(({ image_id, image_s3_key, image_width, image_height, ...puzzle }) => ({
              ...puzzle,
              image:
                image_id && image_s3_key
                  ? {
                      id: image_id,
                      s3_key: image_s3_key,
                      width: image_width!,
                      height: image_height!
                    }
                  : null,
              tags: tagsByPuzzle.get(puzzle.id) ?? []
            }))
          )
        )
      ),
      Effect.mapError(toCacheError('fetchListedPuzzleList', LISTED_PUZZLE_LIST_KEY))
    )
});

const load_word_puzzle: CacheItem<PadavaliPuzzleParams, PadavaliPuzzleType | undefined> =
  createCache<PadavaliPuzzleParams, PadavaliPuzzleType | undefined>({
    getKey: ({ slug }) => wordPuzzleKey(slug),
    schema: puzzle_schema,
    shouldCache: (data) => data !== undefined,
    fetch: ({ slug }) =>
      dbRunHttp('padavali.word_puzzle', async (client) => {
        const [row] = await client
          .select({
            id: puzzles.id,
            slug: puzzles.slug,
            title: puzzles.title,
            created_at: puzzles.created_at,
            updated_at: puzzles.updated_at,
            listed: puzzles.listed,
            description: puzzles.description,
            word_list: padavali_puzzles.word_list,
            grid_data: padavali_puzzles.grid_data,
            grid_dimensions: padavali_puzzles.grid_dimensions,
            image_id: image_assets.id,
            image_s3_key: image_assets.s3_key,
            image_width: image_assets.width,
            image_height: image_assets.height
          })
          .from(puzzles)
          .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
          .leftJoin(image_assets, eq(image_assets.id, puzzles.image_id))
          .where(and(eq(puzzles.kind, 'padavali'), eq(puzzles.slug, slug)))
          .limit(1);
        if (!row) return undefined;

        const attachments = await client
          .select({
            id: puzzle_attachments.id,
            title: puzzle_attachments.title,
            type: puzzle_attachments.type,
            url: puzzle_attachments.url,
            order_index: puzzle_attachments.order_index
          })
          .from(puzzle_attachments)
          .where(eq(puzzle_attachments.puzzle_id, row.id))
          .orderBy(asc(puzzle_attachments.order_index));

        // SAFETY: jsonb columns are stored as the padavali payload written by the editor.
        const dbPuzzle: PadavaliDbPuzzle = {
          id: row.id,
          slug: row.slug,
          title: row.title,
          created_at: row.created_at,
          updated_at: row.updated_at,
          listed: row.listed,
          description: row.description,
          word_list: row.word_list as PadavaliWordCandidate[],
          grid_data: row.grid_data as string[][],
          grid_dimensions: row.grid_dimensions as [number, number],
          attachments,
          image:
            row.image_id && row.image_s3_key
              ? {
                  id: row.image_id,
                  s3_key: row.image_s3_key,
                  width: row.image_width!,
                  height: row.image_height!
                }
              : null
        };
        return toPublicPadavaliPuzzle(dbPuzzle);
      }).pipe(Effect.mapError(toCacheError('fetchWordPuzzle', wordPuzzleKey(slug))))
  });

const load_word_meanings: AiContentCache<WordMeaningsType> = createAiContentCache<
  WordMeaningsInputs,
  WordMeaningsType
>({
  getKey: wordMeaningsKey,
  legacyKey: legacyWordMeaningsKey,
  schema: word_meanings_schema,
  inputHash: wordMeaningsInputHash,
  fitsInputs: (data, inputs) => data.words.length === padavaliActiveWords(inputs.word_list).length,
  load: (puzzle_id) =>
    dbRunHttp('padavali.word_meanings_source', async (client) => {
      const [row] = await client
        .select({
          slug: puzzles.slug,
          title: puzzles.title,
          description: puzzles.description,
          word_list: padavali_puzzles.word_list,
          word_meanings: padavali_puzzles.word_meanings,
          word_meanings_hash: padavali_puzzles.word_meanings_hash
        })
        .from(puzzles)
        .innerJoin(padavali_puzzles, eq(padavali_puzzles.id, puzzles.id))
        .where(and(eq(puzzles.kind, 'padavali'), eq(puzzles.id, puzzle_id)))
        .limit(1);
      if (!row) return undefined;
      return {
        slug: row.slug,
        inputs: { title: row.title, description: row.description, word_list: row.word_list },
        data: row.word_meanings,
        hash: row.word_meanings_hash
      };
    }).pipe(Effect.mapError(toCacheError('fetchWordMeaningsSource', wordMeaningsKey(puzzle_id)))),
  generate: ({ slug, inputs }) =>
    get_puzzle_word_meanings({
      slug,
      title: inputs.title,
      description: inputs.description,
      word_list: padavaliActiveWords(inputs.word_list)
    }),
  save: (puzzle_id, inputs, data, hash) =>
    dbRunHttp('padavali.save_word_meanings', async (client) => {
      await client
        .update(padavali_puzzles)
        .set({
          word_meanings: data,
          word_meanings_hash: hash,
          word_meanings_generated_at: new Date()
        })
        .where(
          and(
            eq(padavali_puzzles.id, puzzle_id),
            // Compare-and-set: drop the write if a save changed the inputs mid-generation
            sql`${padavali_puzzles.word_list} = ${JSON.stringify(inputs.word_list)}::jsonb`,
            exists(
              client
                .select({ id: puzzles.id })
                .from(puzzles)
                .where(
                  and(
                    eq(puzzles.id, puzzle_id),
                    eq(puzzles.title, inputs.title),
                    eq(puzzles.description, inputs.description)
                  )
                )
            )
          )
        );
    }).pipe(Effect.mapError(toCacheError('saveWordMeanings', wordMeaningsKey(puzzle_id))))
});

export type PadavaliCacheLoaders = {
  current_schedule: CacheItem<NoCacheParams, PadavaliCurrentScheduleType>;
  next_schedule: CacheItem<NoCacheParams, PadavaliNextScheduleType>;
  listed_puzzle_list: CacheItem<NoCacheParams, PadavaliListedPuzzlesType>;
  word_puzzle: CacheItem<PadavaliPuzzleParams, PadavaliPuzzleType | undefined>;
  word_meanings: AiContentCache<WordMeaningsType>;
};

export const padavali_cache_loaders: PadavaliCacheLoaders = {
  current_schedule: load_current_schedule,
  next_schedule: load_next_schedule,
  listed_puzzle_list: load_listed_puzzle_list,
  word_puzzle: load_word_puzzle,
  word_meanings: load_word_meanings
};
