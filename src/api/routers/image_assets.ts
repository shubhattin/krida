import { db } from '~/db/db';
import { t, protectedAdminProcedure } from '../trpc_init';
import { z } from 'zod';
import { image_assets } from '~/db/schema';
import { deleteAssetFile } from '~/util/s3/upload_file.server';
import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { escapeIlikeToken, tokenizeSearchQuery } from '~/util/puzzle/search';

const get_image_assets_page_input_schema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).max(50).default(6),
  search_description: z.string().max(150).optional(),
  order_by: z.enum(['asc', 'desc']).optional().default('desc')
});

export const get_image_assets_page = async (
  input: z.input<typeof get_image_assets_page_input_schema>
) => {
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

  const [countResult, list] = await Promise.all([
    db.select({ count: count() }).from(image_assets).where(whereClause),
    db
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
  ]);

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
};

const get_image_assets_page_route = protectedAdminProcedure
  .input(get_image_assets_page_input_schema)
  .query(async ({ input }) => await get_image_assets_page(input));

const delete_image_asset_route = protectedAdminProcedure
  .input(z.object({ id: z.int() }))
  .mutation(async ({ input }): Promise<{ deleted: boolean }> => {
    const [deleted] = await db
      .delete(image_assets)
      .where(eq(image_assets.id, input.id))
      .returning();

    if (!deleted) {
      return { deleted: false };
    }

    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await deleteAssetFile(deleted.s3_key);
        return { deleted: true };
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }
      }
    }

    throw new Error(`Failed to delete asset file from storage: ${String(lastError)}`);
  });

export const image_assets_router = t.router({
  get_image_assets_page: get_image_assets_page_route,
  delete_image_asset: delete_image_asset_route
});
