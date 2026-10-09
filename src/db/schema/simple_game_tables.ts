import {
  pgTable,
  serial,
  jsonb,
  text,
  timestamp,
  index,
  integer,
  boolean,
  varchar,
  uniqueIndex,
  smallint,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { location_list_type } from '../types';
import { type ScriptType } from '~/state/script_list';
import { attachment_type_enum, tags, collections, image_assets } from './common_schema';
import type { SimpleGameKind } from '~/util/games/kinds';

type SimpleGameTables<TPuzzleData> = ReturnType<typeof defineSimpleGameTables<TPuzzleData>>;

export function defineSimpleGameTables<TPuzzleData>(game: SimpleGameKind) {
  const puzzles = pgTable(
    `${game}_puzzles`,
    {
      id: serial().primaryKey(),
      uid: text().notNull().unique(),
      slug: text().notNull(),
      title: text().notNull(),
      description: text().notNull().default(''),
      created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
      updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
      puzzle_data: jsonb().notNull().$type<TPuzzleData>(),
      listed: boolean().notNull().default(false),
      last_listed_at: timestamp({ withTimezone: true }),
      /** Thumbnail is not edited yet; column kept so catalog joins stay uniform. */
      image_id: integer().references(() => image_assets.id, { onDelete: 'set null' })
    },
    (table) => [
      uniqueIndex(`${game}_puzzles_slug_idx`).on(table.slug),
      index(`${game}_puzzles_listed_created_at_idx`).on(table.listed, table.created_at),
      index(`${game}_puzzles_listed_updated_at_idx`).on(table.listed, table.updated_at),
      index(`${game}_puzzles_listed_last_listed_at_idx`).on(table.listed, table.last_listed_at)
    ]
  );

  const redirects = pgTable(`${game}_redirects`, {
    id: serial().primaryKey(),
    puzzle_id: integer()
      .notNull()
      .references(() => puzzles.id, { onDelete: 'cascade' }),
    slug: text().notNull().unique(),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
  });

  const attachments = pgTable(
    `${game}_attachments`,
    {
      id: serial().primaryKey(),
      puzzle_id: integer()
        .notNull()
        .references(() => puzzles.id, { onDelete: 'cascade' }),
      type: attachment_type_enum().notNull(),
      url: text().notNull(),
      title: text(),
      order_index: smallint().notNull().default(1),
      created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
      updated_at: timestamp({ withTimezone: true }).$onUpdate(() => new Date())
    },
    (table) => [index(`${game}_attachments_puzzle_id_idx`).on(table.puzzle_id)]
  );

  const sessions = pgTable(
    `${game}_sessions`,
    {
      id: serial().primaryKey(),
      puzzle_id: integer()
        .notNull()
        .references(() => puzzles.id, { onDelete: 'cascade' }),
      created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
      location: varchar({ length: 25 }).$type<location_list_type>(),
      script: text().$type<ScriptType>(),
      user_id: text()
    },
    (table) => [
      index(`${game}_sessions_puzzle_id_created_at_idx`).on(table.puzzle_id, table.created_at),
      index(`${game}_sessions_user_id_created_at_idx`).on(table.user_id, table.created_at),
      index(`${game}_sessions_user_id_puzzle_id_idx`).on(table.user_id, table.puzzle_id),
      index(`${game}_sessions_puzzle_id_user_id_idx`).on(table.puzzle_id, table.user_id)
    ]
  );

  const gameplay_stats = pgTable(
    `${game}_gameplay_stats`,
    {
      id: serial().primaryKey(),
      puzzle_id: integer()
        .notNull()
        .references(() => puzzles.id, { onDelete: 'cascade' }),
      session_id: integer()
        .notNull()
        .references(() => sessions.id, { onDelete: 'cascade' }),
      created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
      time_taken: integer().notNull(),
      accuracy: integer().notNull(),
      correct_attempts: integer().notNull(),
      total_attempts: integer().notNull()
    },
    (table) => [
      index(`${game}_gameplay_stats_puzzle_id_created_at_idx`).on(
        table.puzzle_id,
        table.created_at
      ),
      uniqueIndex(`${game}_gameplay_stats_session_id_idx`).on(table.session_id)
    ]
  );

  const puzzle_tags = pgTable(
    `${game}_puzzle_tags`,
    {
      puzzle_id: integer()
        .notNull()
        .references(() => puzzles.id, { onDelete: 'cascade' }),
      tag_id: integer()
        .notNull()
        .references(() => tags.id, { onDelete: 'cascade' })
    },
    (table) => [
      primaryKey({ columns: [table.puzzle_id, table.tag_id] }),
      index(`${game}_puzzle_tags_tag_id_idx`).on(table.tag_id)
    ]
  );

  const collection_items = pgTable(
    `${game}_collection_items`,
    {
      collection_id: integer()
        .notNull()
        .references(() => collections.id, { onDelete: 'cascade' }),
      puzzle_id: integer()
        .notNull()
        .references(() => puzzles.id, { onDelete: 'cascade' }),
      order_index: smallint().notNull().default(1),
      created_at: timestamp({ withTimezone: true }).notNull().defaultNow()
    },
    (table) => [
      primaryKey({ columns: [table.collection_id, table.puzzle_id] }),
      index(`${game}_collection_items_puzzle_id_idx`).on(table.puzzle_id)
    ]
  );

  const puzzlesRelations = relations(puzzles, ({ many, one }) => ({
    stats: many(gameplay_stats),
    sessions: many(sessions),
    attachments: many(attachments),
    redirects: many(redirects),
    puzzle_tags: many(puzzle_tags),
    collection_items: many(collection_items),
    image: one(image_assets, {
      fields: [puzzles.image_id],
      references: [image_assets.id]
    })
  }));

  const puzzle_tagsRelations = relations(puzzle_tags, ({ one }) => ({
    puzzle: one(puzzles, {
      fields: [puzzle_tags.puzzle_id],
      references: [puzzles.id]
    }),
    tag: one(tags, {
      fields: [puzzle_tags.tag_id],
      references: [tags.id]
    })
  }));

  const collection_itemsRelations = relations(collection_items, ({ one }) => ({
    collection: one(collections, {
      fields: [collection_items.collection_id],
      references: [collections.id]
    }),
    puzzle: one(puzzles, {
      fields: [collection_items.puzzle_id],
      references: [puzzles.id]
    })
  }));

  const redirectsRelations = relations(redirects, ({ one }) => ({
    puzzle: one(puzzles, {
      fields: [redirects.puzzle_id],
      references: [puzzles.id]
    })
  }));

  const attachmentsRelations = relations(attachments, ({ one }) => ({
    puzzle: one(puzzles, {
      fields: [attachments.puzzle_id],
      references: [puzzles.id]
    })
  }));

  const sessionsRelations = relations(sessions, ({ one }) => ({
    puzzle: one(puzzles, {
      fields: [sessions.puzzle_id],
      references: [puzzles.id]
    }),
    stats: one(gameplay_stats)
  }));

  const gameplay_statsRelations = relations(gameplay_stats, ({ one }) => ({
    puzzle: one(puzzles, {
      fields: [gameplay_stats.puzzle_id],
      references: [puzzles.id]
    }),
    session: one(sessions, {
      fields: [gameplay_stats.session_id],
      references: [sessions.id]
    })
  }));

  return {
    puzzles,
    redirects,
    attachments,
    sessions,
    gameplay_stats,
    puzzle_tags,
    collection_items,
    puzzlesRelations,
    puzzle_tagsRelations,
    collection_itemsRelations,
    redirectsRelations,
    attachmentsRelations,
    sessionsRelations,
    gameplay_statsRelations
  };
}

export type SimpleGameTableSet<TPuzzleData> = SimpleGameTables<TPuzzleData>;
