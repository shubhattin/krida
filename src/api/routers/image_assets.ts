import { Effect, Schedule } from 'effect';
import { t, protectedAdminProcedure } from '../trpc_init';
import { z } from 'zod';
import { image_assets } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { ObjectStorage } from '~/effect/storage';
import { runTrpcEffect } from '~/effect/run';
import { and, asc, desc, eq, ilike } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';

const get_image_assets_page_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(6),
  search_description: z.string().max(150).optional(),
  order_by: z.enum(['asc', 'desc']).optional().default('desc')
});

/** Upper bound on ANDed ILIKE terms per query — see search handler below. */
const MAX_SEARCH_TOKENS = 6;

const s3DeleteRetrySchedule = Schedule.recurs(2).pipe(
  Schedule.addDelay(() => Effect.succeed('1 second'))
);

export const get_image_assets_page = Effect.fn('image_assets.get_page')(function* (
  input: z.input<typeof get_image_assets_page_input_schema>
) {
  const { page, size, search_description, order_by } =
    get_image_assets_page_input_schema.parse(input);

  const trimmedSearch = search_description?.trim();
  // Cap tokens so a pasted paragraph can't generate dozens of ANDed ILIKEs,
  // each of which forces its own scan over the table.
  const searchTokens = trimmedSearch
    ? tokenizeSearchQuery(trimmedSearch).slice(0, MAX_SEARCH_TOKENS)
    : [];
  const conditions = [];
  for (const token of searchTokens) {
    const pattern = `%${escapeIlikeToken(token)}%`;
    conditions.push(ilike(image_assets.description, pattern));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderPrimary =
    order_by === 'desc' ? desc(image_assets.created_at) : asc(image_assets.created_at);
  const orderTiebreaker = order_by === 'desc' ? desc(image_assets.id) : asc(image_assets.id);
  const offset = (page - 1) * size;

  // Single round-trip: COUNT(*) OVER() returns the filtered total alongside the
  // page rows. Previously count + page ran as two parallel queries, i.e. two
  // full scans per keystroke competing for pool connections.
  const rows = yield* dbRunHttp('image_assets.select_page', (client) =>
    client
      .select({
        id: image_assets.id,
        description: image_assets.description,
        s3_key: image_assets.s3_key,
        width: image_assets.width,
        height: image_assets.height,
        created_at: image_assets.created_at,
        total_count: sql<number>`count(*) over()`
      })
      .from(image_assets)
      .where(whereClause)
      .orderBy(orderPrimary, orderTiebreaker)
      .limit(size)
      .offset(offset)
  );

  const total = Number(rows[0]?.total_count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const list = rows.map(({ total_count: _total_count, ...asset }) => asset);

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
        const rows = yield* dbRunHttp('image_assets.select_for_delete', (client) =>
          client
            .select({ id: image_assets.id, s3_key: image_assets.s3_key })
            .from(image_assets)
            .where(eq(image_assets.id, input.id))
            .limit(1)
        );
        const asset = rows[0];
        if (!asset) {
          return { deleted: false };
        }

        const deleted = yield* dbRunHttp('image_assets.delete_row', (client) =>
          client.delete(image_assets).where(eq(image_assets.id, input.id)).returning()
        );
        if (deleted[0] === undefined) {
          return { deleted: false };
        }

        const storage = yield* ObjectStorage;
        yield* storage.deleteAssetFile(asset.s3_key).pipe(
          Effect.retry(s3DeleteRetrySchedule),
          Effect.catchTag('StorageError', (error) =>
            Effect.logWarning('Failed to delete image asset from storage after DB delete').pipe(
              Effect.annotateLogs({
                s3_key: asset.s3_key,
                operation: error.operation
              })
            )
          )
        );

        return { deleted: true };
      })
    )
  );

export const image_assets_router = t.router({
  get_image_assets_page: get_image_assets_page_route,
  delete_image_asset: delete_image_asset_route
});
