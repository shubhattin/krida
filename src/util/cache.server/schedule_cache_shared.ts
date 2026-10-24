import type { SetCommandOptions } from '@upstash/redis';
import { and, asc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { puzzle_schedules, puzzles } from '~/db/schema';
import type { DbHttpClient } from '~/effect/database';
import type { RedisJsonValue } from '~/effect/redis';

/**
 * Cached for `current_schedule` while no puzzle is live. It expires at the next scheduled
 * start, so the first request after that refetches on its own — no client-triggered refresh.
 * `none_until: null` means nothing is scheduled; schedule writes invalidate the key.
 */
export type NoLiveSchedule = { none_until: Date | null };

const no_live_schedule_schema = z.object({ none_until: z.coerce.date().nullable() });

export const isNoLiveSchedule = <T extends object>(
  data: T | NoLiveSchedule
): data is NoLiveSchedule => 'none_until' in data;

/**
 * Parse a cached current-schedule value. The old permanent `'undefined'` sentinel is a miss,
 * so it is rewritten once with an expiry.
 */
export const parseCurrentScheduleCache =
  <T>(schema: z.ZodType<T>) =>
  (raw: RedisJsonValue): T | NoLiveSchedule | null => {
    const live = schema.safeParse(raw);
    if (live.success) return live.data;
    const none = no_live_schedule_schema.safeParse(raw);
    return none.success ? none.data : null;
  };

/** Never in the past: Redis drops a key whose EXAT has already passed. */
const toExat = (at: Date) =>
  Math.max(Math.floor(at.getTime() / 1000), Math.floor(Date.now() / 1000) + 1);

/** Live: expire just before it ends. None live: expire when the next one starts. */
export const currentScheduleSetOptions = (
  data: { end_time: Date } | NoLiveSchedule
): SetCommandOptions | undefined => {
  if (!isNoLiveSchedule(data)) return { exat: toExat(new Date(data.end_time.getTime() - 2000)) };
  return data.none_until ? { exat: toExat(data.none_until) } : undefined;
};

/** Earliest schedule of `kind` starting after `now`, or null. */
export const nextScheduleStart = async (
  client: DbHttpClient,
  kind: 'padavali' | 'padajala',
  now: Date
): Promise<Date | null> => {
  const [next] = await client
    .select({ start_time: puzzle_schedules.start_time })
    .from(puzzle_schedules)
    .innerJoin(puzzles, eq(puzzles.id, puzzle_schedules.puzzle_id))
    .where(and(eq(puzzles.kind, kind), gt(puzzle_schedules.start_time, now)))
    .orderBy(asc(puzzle_schedules.start_time))
    .limit(1);
  return next?.start_time ?? null;
};
