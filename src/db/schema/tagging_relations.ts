import { relations } from 'drizzle-orm';
import { collections, image_assets, tags } from './common_schema';
import { crossword_collection_items, crossword_puzzle_tags } from './crossword_schema';
import { padavali_collection_items, padavali_puzzle_tags } from './padavali_schema';
import { dvayi_collection_items, dvayi_puzzle_tags } from './dvayi_schema';
import { bhramita_collection_items, bhramita_puzzle_tags } from './bhramita_schema';
import { surupa_collection_items, surupa_puzzle_tags } from './surupa_schema';
import { anveshi_collection_items, anveshi_puzzle_tags } from './anveshi_schema';

/**
 * Shared-side relations live here so `common_schema` does not import the game
 * schemas (those already import `tags` and `collections`).
 */
export const tagsRelations = relations(tags, ({ many }) => ({
  padavali_links: many(padavali_puzzle_tags),
  crossword_links: many(crossword_puzzle_tags),
  dvayi_links: many(dvayi_puzzle_tags),
  bhramita_links: many(bhramita_puzzle_tags),
  surupa_links: many(surupa_puzzle_tags),
  anveshi_links: many(anveshi_puzzle_tags)
}));

export const collectionsRelations = relations(collections, ({ many, one }) => ({
  image: one(image_assets, {
    fields: [collections.image_id],
    references: [image_assets.id]
  }),
  padavali_items: many(padavali_collection_items),
  crossword_items: many(crossword_collection_items),
  dvayi_items: many(dvayi_collection_items),
  bhramita_items: many(bhramita_collection_items),
  surupa_items: many(surupa_collection_items),
  anveshi_items: many(anveshi_collection_items)
}));
