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
  primaryKey,
  index,
  integer,
  unique,
  check
} from 'drizzle-orm/pg-core';
import { ATTACHMENT_TYPE_LIST } from '../db_shared_vals';
import type { BatchMetadata } from '~/util/types/ai_batch_metadata';
import { relations, sql } from 'drizzle-orm';

export const image_assets = pgTable(
  'image_assets',
  {
    id: serial().primaryKey(),
    description: varchar('description', { length: 150 }),
    width: smallint().notNull(),
    height: smallint().notNull(),
    s3_key: text().notNull(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('image_assets_created_at_id_idx').on(table.created_at, table.id),
    // GIN trigram index so LIKE/ILIKE '%…%' substring search on description
    // uses an index scan instead of a sequential scan. Requires the pg_trgm
    // extension (add `CREATE EXTENSION IF NOT EXISTS "pg_trgm";` manually to
    // the generated migration — drizzle-kit does not manage extensions).
    index('image_assets_description_trgm_idx').using('gin', table.description.op('gin_trgm_ops'))
  ]
);

/**
 * Editable system-prompt templates for image-prompt generation.
 * Built-in defaults live statically in code (`DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE`
 * etc. in `~/util/ai/image_gen`); rows here are user-created alternatives.
 * The fixed part (output-schema contract) stays in code; template content is
 * the injectable part. `subject` scopes a template to puzzle cards or
 * collection covers.
 */
export const image_system_prompt_templates = pgTable(
  'image_system_prompt_templates',
  {
    id: serial().primaryKey(),
    subject: text().notNull().default('puzzle').$type<'puzzle' | 'collection'>(),
    title: text().notNull(),
    content: text().notNull().default(''),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true })
  },
  (table) => [
    unique('image_system_prompt_templates_subject_title_unique').on(table.subject, table.title)
  ]
);

/**
 * Loose labels shared by every game. A puzzle can carry many tags, and a tag
 * does not decide collection membership.
 */
export const tags = pgTable('tags', {
  id: serial().primaryKey(),
  /** URL-safe identifier, e.g. `shri-rama`. */
  slug: text().notNull().unique(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
});

/**
 * A curated, ordered set of games. Membership is hand-picked per game via join
 * tables, so a collection can mix games from every catalog.
 */
export const collections = pgTable(
  'collections',
  {
    id: serial().primaryKey(),
    /** Short unique nano-id */
    uid: text().notNull().unique(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    description: text().notNull().default(''),
    image_id: integer().references(() => image_assets.id, { onDelete: 'set null' }),
    /** Whether the collection is listed on the public puzzles pages */
    listed: boolean().notNull().default(false),
    /**
     * 1-based position on the public collections list, contiguous across ordered rows.
     * Only listed collections carry one; `null` = unordered, shown after the ordered
     * ones (newest first). Contiguity is not a DB constraint: every writer must take
     * `lockCollectionOrder` and go through the helpers in `src/api/routers/catalog.ts`.
     */
    order_index: smallint(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
  },
  (table) => [
    index('collections_listed_created_at_idx').on(table.listed, table.created_at),
    index('collections_listed_order_index_idx').on(table.listed, table.order_index),
    check(
      'collections_order_index_listed_check',
      sql`${table.order_index} is null or ${table.listed}`
    )
  ]
);

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

/** Relations */

export const ai_batchesRelations = relations(ai_batches, ({ many }) => ({
  responses: many(ai_batch_responses)
}));

export const ai_batch_responsesRelations = relations(ai_batch_responses, ({ one }) => ({
  batch: one(ai_batches, {
    fields: [ai_batch_responses.batch_id],
    references: [ai_batches.batch_id]
  })
}));
