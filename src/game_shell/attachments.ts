import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AnyPgColumn, AnyPgTable } from 'drizzle-orm/pg-core';
import type { DbTransaction } from '~/effect/database';
import type { attachment_list_type } from '~/db/db_shared_vals';

export type PuzzleAttachmentInput = {
  id: number | null;
  type: attachment_list_type;
  url: string;
  title: string | null;
  order_index: number;
};

export type GameAttachmentTable = AnyPgTable & {
  id: AnyPgColumn;
  puzzle_id: AnyPgColumn;
  type: AnyPgColumn;
  url: AnyPgColumn;
  title: AnyPgColumn;
  order_index: AnyPgColumn;
};

export async function syncPuzzleAttachments(
  tx: DbTransaction,
  table: GameAttachmentTable,
  puzzle_id: number,
  attachments: PuzzleAttachmentInput[]
) {
  const current_attachments = (
    await tx.select({ id: table.id }).from(table).where(eq(table.puzzle_id, puzzle_id))
  ).map((row) => ({
    // SAFETY: attachment tables always select serial id.
    id: row.id as number
  }));
  const new_attachments = attachments
    .map((attachment, i) => ({ index: i, data: attachment }))
    .filter((attachment) => !attachment.data.id);
  const existing_attachments = attachments.filter((attachment) => attachment.id);
  const updated_attachments = existing_attachments.filter((attachment) =>
    current_attachments.some((row) => row.id === attachment.id)
  );
  const deleted_attachments = current_attachments.filter(
    (attachment) => !attachments.some((row) => row.id === attachment.id)
  );

  const update_existing =
    updated_attachments.length > 0
      ? (() => {
          const value_rows = updated_attachments.map(
            (attachment) =>
              sql`(${attachment.id!}::int, ${attachment.type}::attachment_type, ${attachment.url}::text, ${attachment.order_index}::smallint, ${attachment.title}::text)`
          );
          return tx.execute(sql`
            UPDATE ${table} AS t
            SET
              type = v.type,
              url = v.url,
              order_index = v.order_index,
              title = v.title,
              updated_at = now()
            FROM (VALUES ${sql.join(value_rows, sql`, `)}) AS v(id, type, url, order_index, title)
            WHERE t.puzzle_id = ${puzzle_id}
              AND t.id = v.id
          `);
        })()
      : Promise.resolve();

  const emptyInserted: { id: number }[] = [];
  const [new_attachments_inserted] = await Promise.all([
    new_attachments.length > 0
      ? tx
          .insert(table)
          .values(
            new_attachments.map((attachment) => ({
              puzzle_id,
              type: attachment.data.type,
              url: attachment.data.url,
              order_index: attachment.data.order_index,
              title: attachment.data.title
            }))
          )
          .returning()
      : emptyInserted,
    deleted_attachments.length > 0
      ? tx.delete(table).where(
          and(
            eq(table.puzzle_id, puzzle_id),
            inArray(
              table.id,
              deleted_attachments.map((row) => row.id)
            )
          )
        )
      : Promise.resolve(),
    update_existing
  ]);

  return {
    newly_added_index_ids: new_attachments_inserted.map((row, i) => ({
      // SAFETY: returning() always includes serial attachment id.
      id: row.id as number,
      index: new_attachments[i]!.index
    }))
  };
}
