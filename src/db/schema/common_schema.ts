import {
  pgTable,
  serial,
  varchar,
  smallint,
  text,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
  primaryKey
} from 'drizzle-orm/pg-core';
import { ATTACHMENT_TYPE_LIST } from '../db_shared_vals';
import type { BatchMetadata } from '~/util/types/ai_batch_metadata';

export const image_assets = pgTable('image_assets', {
  id: serial().primaryKey(),
  description: varchar('description', { length: 150 }),
  width: smallint().notNull(),
  height: smallint().notNull(),
  s3_key: text().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

export const attachment_type_enum = pgEnum('attachment_type', ATTACHMENT_TYPE_LIST);

/** One OpenAI Batch API job — shared fields for all custom_id responses in the batch. */
export const ai_batches = pgTable('ai_batches', {
  /** id returned by the Batch API */
  batch_id: text().primaryKey(),
  type: text().notNull().$type<'image' | 'text' | 'object'>(),
  /** whether OpenAI batch output has been fetched and applied to all response rows */
  output_resolved: boolean().notNull().default(false),
  /** Uploaded id for openai batch file input */
  input_file_id: text().notNull(),
  /** Uploaded id for openai batch file output (null until resolved) */
  output_file_id: text()
});

/** Per custom_id response / job within an OpenAI batch. */
export const ai_batch_responses = pgTable(
  'ai_batch_responses',
  {
    batch_id: text()
      .notNull()
      .references(() => ai_batches.batch_id, { onDelete: 'cascade' }),
    custom_id: text().notNull(),
    /** if the resource should be auto added to the main database */
    auto_approved: boolean().notNull().default(false),
    /** Extra info to store for future reference */
    metadata: jsonb().notNull().$type<BatchMetadata>()
  },
  (table) => [primaryKey({ columns: [table.batch_id, table.custom_id] })]
);
