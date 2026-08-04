import { Effect, Schedule } from 'effect';
import { t, protectedAdminProcedure } from '../trpc_init';
import { z } from 'zod';
import { image_assets } from '~/db/schema';
import { dbRun } from '~/effect/database';
import { ObjectStorage } from '~/effect/storage';
import { runTrpcEffect } from '~/effect/run';
import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';

const get_image_assets_page_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(6),
  search_description: z.string().max(150).optional(),
  order_by: z.enum(['asc', 'desc']).optional().default('desc')
});

export const get_image_assets_page = Effect.fn('image_assets.get_page')(function* (
  input: z.input<typeof get_image_assets_page_input_schema>
) {
  const { page, size, search_description, order_by } =
    get_image_assets_page_input_schema.parse(input);

  const trimmedSearch = search_description?.trim();
  const conditions = [];
  if (trimmedSearch) {
    for (const token of tokenizeSearchQuery(trimmedSearch)) {
      const pattern = `%${escapeIlikeToken(token)}%`;
      conditions.push(ilike(image_assets.description, pattern));
    }
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderPrimary =
    order_by === 'desc' ? desc(image_assets.created_at) : asc(image_assets.created_at);
  const orderTiebreaker = order_by === 'desc' ? desc(image_assets.id) : asc(image_assets.id);
  const offset = (page - 1) * size;

  const { countResult, list } = yield* Effect.all({
    countResult: dbRun('image_assets.count_page', (client) =>
      client.select({ count: count() }).from(image_assets).where(whereClause)
    ),
    list: dbRun('image_assets.select_page', (client) =>
      client
        .select({
          id: image_assets.id,
          description: image_assets.description,
          s3_key: image_assets.s3_key,
          width: image_assets.width,
          height: image_assets.height,
          created_at: image_assets.created_at
        })
        .from(image_assets)
        .where(whereClause)
        .orderBy(orderPrimary, orderTiebreaker)
        .limit(size)
        .offset(offset)
    )
  });

  const total = Number(countResult[0]?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / size));

  return {
    list,
    total,
    page,
    pageCount,
    hasPrev: page > 1,
    hasNext: page < pageCount
  };
});

const get_image_assets_page_route = protectedAdminProcedure
  .input(get_image_assets_page_input_schema)
  .query(({ input }) => runTrpcEffect(get_image_assets_page(input)));

const delete_image_asset_route = protectedAdminProcedure
  .input(z.object({ id: z.int() }))
  .mutation(({ input }): Promise<{ deleted: boolean }> =>
    runTrpcEffect(
      Effect.gen(function* () {
        const deleted_rows = yield* dbRun('image_assets.delete_row', (client) =>
          client.delete(image_assets).where(eq(image_assets.id, input.id)).returning()
        );
        const deleted = deleted_rows[0];

        if (!deleted) {
          return { deleted: false };
        }

        const storage = yield* ObjectStorage;
        yield* storage.deleteAssetFile(deleted.s3_key).pipe(Effect.retry(Schedule.recurs(2)));

        return { deleted: true };
      })
    )
  );

export const image_assets_router = t.router({
  get_image_assets_page: get_image_assets_page_route,
  delete_image_asset: delete_image_asset_route
});
