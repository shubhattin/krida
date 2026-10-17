import { relations } from 'drizzle-orm';
import { collections, image_assets, tags } from './common_schema';
import { collection_items, puzzle_tags } from './puzzles_schema';

/**
 * Shared-side relations live here so `common_schema` does not import the puzzle
 * tables (those already import `tags` and `collections`).
 */
export const tagsRelations = relations(tags, ({ many }) => ({
  links: many(puzzle_tags)
}));

export const collectionsRelations = relations(collections, ({ many, one }) => ({
  image: one(image_assets, {
    fields: [collections.image_id],
    references: [image_assets.id]
  }),
  items: many(collection_items)
}));
