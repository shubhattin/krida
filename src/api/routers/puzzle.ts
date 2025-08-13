import { z } from 'zod';
import { protectedAdminProcedure, t } from '../trpc_init';
import { db } from '~/db/db';
import { word_puzzle_attachments, word_puzzles } from '~/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { padavali_stats_router } from './padavali_stats';
import { redis, REDIS_CACHE_KEYS } from '~/db/redis';
import { get_word_puzzle, type CurrentScheduleType } from '~/db/db_cache_data';
import { puzzle_add_input_schema, puzzle_update_input_schema } from '~/db/db_shared_vals';
import { sendOneSignalNotification } from '~/lib/onesignal';
import { delay } from '~/tools/delay';

const puzzle_in_current_schedule = async (id: number, uuid: string) => {
  const cache = await redis.get<CurrentScheduleType | string>(REDIS_CACHE_KEYS.current_schedule());
  if (!cache || cache === 'undefined') return false;
  if (typeof cache === 'object') {
    return cache.puzzle.id === id && cache.puzzle.uuid === uuid;
  }
  return false;
};

export const notify_for_archived_puzzle = async (title: string, id: number, uuid: string) => {
  return await sendOneSignalNotification({
    headings: { en: '🧩 New Archived Puzzle Added! 🎉' },
    contents: {
      en: `"${title}" - Archived Puzzle Added, Play Now! 🚀`
    },
    name: `new_archived_puzzle:${id}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/padavali/archived/${id}:${uuid}`
  });
};

const update_puzzle_route = protectedAdminProcedure
  .input(puzzle_update_input_schema)
  .mutation(async ({ input: { puzzle_id, puzzle_data, puzzle_uuid } }) => {
    revalidatePath('/padavali/list');
    const prev_archived = (await db.query.word_puzzles.findFirst({
      columns: {
        archived: true
      },
      where: (tbl, { eq }) => eq(tbl.id, puzzle_id)
    }))!.archived;
    const { attachments, ...puzzle_data_rest } = puzzle_data;

    async function update_puzzle_attachments() {
      const current_attachments = await db.query.word_puzzle_attachments.findMany({
        where: (tbl, { eq }) => eq(tbl.puzzle_id, puzzle_id),
        columns: {
          id: true
        }
      });
      const new_attachments = attachments
        .map((attachment, i) => ({
          index: i,
          data: attachment
        }))
        .filter((attachment) => !attachment.data.id);
      const existing_attachments = attachments.filter((attachment) => attachment.id);
      const updated_attachments = existing_attachments.filter((attachment) =>
        current_attachments.some((a) => a.id === attachment.id)
      );
      const deleted_attachments = current_attachments.filter(
        (attachment) => !attachments.some((a) => a.id === attachment.id)
      );
      const [new_attachments_inserted] = await Promise.all([
        // inserting new attachments
        new_attachments.length > 0
          ? db
              .insert(word_puzzle_attachments)
              .values(
                new_attachments.map((a) => ({
                  puzzle_id,
                  type: a.data.type,
                  url: a.data.url,
                  order_index: a.data.order_index,
                  title: a.data.title
                }))
              )
              .returning()
          : ([] as { id: number }[]),
        // deleting attachments
        db.delete(word_puzzle_attachments).where(
          and(
            eq(word_puzzle_attachments.puzzle_id, puzzle_id),
            inArray(
              word_puzzle_attachments.id,
              deleted_attachments.map((a) => a.id)
            )
          )
        ),
        // updating existing attachments
        updated_attachments.map(
          async (a) =>
            await db
              .update(word_puzzle_attachments)
              .set({
                type: a.type,
                url: a.url,
                order_index: a.order_index,
                title: a.title
              })
              .where(
                and(
                  eq(word_puzzle_attachments.id, a.id!),
                  eq(word_puzzle_attachments.puzzle_id, puzzle_id)
                )
              )
        )
      ]);

      return {
        newly_added_index_ids: new_attachments_inserted.map((a, i) => ({
          id: a.id,
          index: new_attachments[i].index
        }))
      };
    }

    const out = await Promise.allSettled([
      db
        .update(word_puzzles)
        .set(puzzle_data_rest)
        .where(and(eq(word_puzzles.id, puzzle_id), eq(word_puzzles.uuid, puzzle_uuid))),
      update_puzzle_attachments(),
      !prev_archived &&
        puzzle_data.archived &&
        db
          .update(word_puzzles)
          .set({ last_archived_at: new Date() })
          .where(and(eq(word_puzzles.id, puzzle_id), eq(word_puzzles.uuid, puzzle_uuid)))
    ]);
    // cache invalidation later
    await Promise.allSettled([
      // invalidate when archived state changes or when puzzle is archived (as title and description are stored in archived list)
      (puzzle_data.archived || prev_archived !== puzzle_data.archived) &&
        redis.del(REDIS_CACHE_KEYS.archived_puzzle_list()),
      redis.del(REDIS_CACHE_KEYS.word_puzzle(puzzle_id, puzzle_uuid)),
      (await puzzle_in_current_schedule(puzzle_id, puzzle_uuid)) &&
        redis.del(REDIS_CACHE_KEYS.current_schedule()),
      puzzle_data.archived &&
        !prev_archived &&
        notify_for_archived_puzzle(puzzle_data_rest.title, puzzle_id, puzzle_uuid)
    ]);
    return {
      success: true,
      newly_added_index_ids: out[1].status === 'fulfilled' ? out[1].value.newly_added_index_ids : []
    };
  });

const add_puzzle_route = protectedAdminProcedure
  .input(puzzle_add_input_schema)
  .mutation(async ({ input }) => {
    revalidatePath('/padavali/list');
    const { attachments, ...puzzle_data_rest } = input;
    const [info] = await Promise.all([
      db
        .insert(word_puzzles)
        .values({
          ...puzzle_data_rest,
          ...(puzzle_data_rest.archived ? { last_archived_at: new Date() } : {})
        })
        .returning()
    ]);
    await Promise.allSettled([
      // only invalidate list when puzzle is archived
      input.archived && (await redis.del(REDIS_CACHE_KEYS.archived_puzzle_list())),
      input.archived && notify_for_archived_puzzle(puzzle_data_rest.title, info[0].id, info[0].uuid)
    ]);
    const new_attachment_ids =
      attachments.length > 0
        ? (
            await db
              .insert(word_puzzle_attachments)
              .values(
                attachments.map((attachment) => {
                  const { id, ...rest } = attachment;
                  return {
                    ...rest,
                    puzzle_id: info[0].id
                  };
                })
              )
              .returning()
          ).map((a) => a.id)
        : [];
    return {
      id: info[0].id,
      uuid: info[0].uuid,
      newly_added_index_ids: new_attachment_ids
    };
  });

const delete_puzzle_route = protectedAdminProcedure
  .input(z.object({ id: z.number().int(), uuid: z.string().uuid() }))
  .mutation(async ({ input: { id, uuid } }) => {
    revalidatePath('/padavali/list');
    const { archived } = (await db.query.word_puzzles.findFirst({
      columns: {
        archived: true
      },
      where: (tbl, { eq }) => eq(tbl.id, id)
    }))!;

    await Promise.allSettled([db.delete(word_puzzles).where(eq(word_puzzles.id, id))]);
    await Promise.allSettled([
      // only invalidate list when puzzle is archived
      archived && redis.del(REDIS_CACHE_KEYS.archived_puzzle_list()),
      redis.del(REDIS_CACHE_KEYS.word_puzzle(id, uuid)),
      (await puzzle_in_current_schedule(id, uuid)) && redis.del(REDIS_CACHE_KEYS.current_schedule())
    ]);
    return {
      success: true
    };
  });

const get_puzzle_data_input_schema = z.object({
  limit: z.number().int(),
  search_title: z.string().optional(),
  archived_filter: z.boolean().optional(),
  sort_by: z.enum(['created_at', 'updated_at']).optional(),
  last_created_or_updated_at: z.coerce.date().optional(),
  last_id: z.number().int().optional()
});

export const get_puzzle_list_page = async (input: z.input<typeof get_puzzle_data_input_schema>) => {
  const { limit, search_title, archived_filter, sort_by, last_created_or_updated_at, last_id } =
    input;

  await delay(400);
  const rows = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      uuid: true,
      title: true,
      description: true,
      archived: true,
      created_at: true,
      updated_at: true
    },
    where: (tbl, { and, or, eq, ilike, lt }) => {
      const conds: ReturnType<typeof and>[] = [];
      if (typeof archived_filter === 'boolean') {
        conds.push(eq(tbl.archived, archived_filter));
      }
      if (typeof search_title === 'string' && search_title.length > 0) {
        conds.push(ilike(tbl.title, `%${search_title}%`));
      }
      if (last_created_or_updated_at instanceof Date) {
        const sortCol = sort_by === 'updated_at' ? tbl.updated_at : tbl.created_at;
        if (typeof last_id === 'number') {
          conds.push(
            or(
              lt(sortCol, last_created_or_updated_at),
              and(eq(sortCol, last_created_or_updated_at), lt(tbl.id, last_id))
            )
          );
        } else {
          conds.push(lt(sortCol, last_created_or_updated_at));
        }
      }
      return conds.length > 0 ? and(...conds) : undefined;
    },
    orderBy: (tbl, { desc }) => {
      const sortCol = sort_by === 'updated_at' ? tbl.updated_at : tbl.created_at;
      return [desc(sortCol)];
    },
    limit
  });

  return rows;
};

const get_puzzle_list_page_route = protectedAdminProcedure
  .input(get_puzzle_data_input_schema)
  .query(async ({ input }) => await get_puzzle_list_page(input));

const get_archived_puzzle_list_route = protectedAdminProcedure.query(async () => {
  const puzzles = await db.query.word_puzzles.findMany({
    columns: {
      id: true,
      title: true
    },
    orderBy: ({ created_at }, { desc }) => desc(created_at),
    where: ({ archived }, { eq }) => eq(archived, false)
  });
  return puzzles;
});

export const puzzle_router = t.router({
  update_puzzle: update_puzzle_route,
  add_puzzle: add_puzzle_route,
  delete_puzzle: delete_puzzle_route,
  stats: padavali_stats_router,
  get_puzzle_list_page: get_puzzle_list_page_route
});
