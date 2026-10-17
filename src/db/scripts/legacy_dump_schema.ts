import { z } from 'zod';
import { ATTACHMENT_TYPE_LIST } from '~/db/db_shared_vals';
import { location_list_enum } from '~/db/types';
import { CrossWordPuzzleWordSchema, CrossordPuzzleGridCellSchema } from '~/db/schema_zod';
import { script_list_enum } from '~/state/script_list';
import { anveshi_puzzle_data_schema } from '~/util/anveshi/data';
import { bhramita_puzzle_data_schema } from '~/util/bhramita/data';
import { dvayi_puzzle_data_schema } from '~/util/dvayi/data';
import { padavali_word_candidate_list_schema } from '~/util/puzzle/word_list';
import { surupa_puzzle_data_schema } from '~/util/surupa/data';
import { batch_metadata_schema } from '~/util/types/ai_batch_metadata';

/**
 * Row shapes of the per-game dump written by `import_data.ts` before the
 * `puzzles` supertype, and by `backup_json.ts` afterwards. These schemas are
 * hand-written so they do not follow the current Drizzle tables.
 */

const nullableDate = z.coerce.date().nullable();

const listingFields = {
  id: z.number().int(),
  uid: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  created_at: z.coerce.date(),
  updated_at: nullableDate,
  listed: z.boolean(),
  last_listed_at: nullableDate,
  image_id: z.number().int().nullable()
};

const redirectRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  slug: z.string(),
  created_at: z.coerce.date()
});

const attachmentRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  type: z.enum(ATTACHMENT_TYPE_LIST),
  url: z.string(),
  title: z.string().nullable(),
  order_index: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: nullableDate
});

const scheduleRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: nullableDate,
  listing_verify_key: z.string().nullable()
});

const attemptStatsRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  session_id: z.number().int(),
  created_at: z.coerce.date(),
  time_taken: z.number().int(),
  accuracy: z.number().int(),
  correct_attempts: z.number().int(),
  total_attempts: z.number().int()
});

const tagLinkRow = z.object({
  puzzle_id: z.number().int(),
  tag_id: z.number().int()
});

const collectionItemRow = z.object({
  collection_id: z.number().int(),
  puzzle_id: z.number().int(),
  order_index: z.number().int(),
  created_at: z.coerce.date()
});

const padavaliSessionRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  created_at: z.coerce.date(),
  practice_mode: z.boolean(),
  location: location_list_enum.nullable(),
  script: script_list_enum.nullable(),
  user_id: z.string().nullable()
});

const simpleSessionRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  created_at: z.coerce.date(),
  location: location_list_enum.nullable(),
  script: script_list_enum.nullable(),
  user_id: z.string().nullable()
});

const crosswordSessionRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  created_at: z.coerce.date(),
  location: location_list_enum.nullable(),
  user_id: z.string().nullable()
});

const crosswordStatsRow = z.object({
  id: z.number().int(),
  puzzle_id: z.number().int(),
  session_id: z.number().int(),
  created_at: z.coerce.date(),
  time_taken: z.number().int(),
  accuracy: z.number().int(),
  total_entries: z.number().int(),
  total_cells: z.number().int(),
  prefilled_cells: z.number().int(),
  letter_inputs: z.number().int(),
  incorrect_entry_attempts: z.number().int()
});

function simpleGameShape<T extends z.ZodType>(puzzleData: T) {
  return {
    puzzles: z.array(z.object({ ...listingFields, puzzle_data: puzzleData })).default([]),
    redirects: z.array(redirectRow).default([]),
    attachments: z.array(attachmentRow).default([]),
    sessions: z.array(simpleSessionRow).default([]),
    gameplay_stats: z.array(attemptStatsRow).default([]),
    puzzle_tags: z.array(tagLinkRow).default([]),
    collection_items: z.array(collectionItemRow).default([])
  };
}

const dvayiShape = simpleGameShape(dvayi_puzzle_data_schema);
const bhramitaShape = simpleGameShape(bhramita_puzzle_data_schema);
const surupaShape = simpleGameShape(surupa_puzzle_data_schema);
const anveshiShape = simpleGameShape(anveshi_puzzle_data_schema);

export const LegacyDumpSchema = z.object({
  padavali_puzzles: z.array(
    z.object({
      ...listingFields,
      word_list: padavali_word_candidate_list_schema,
      grid_data: z.array(z.array(z.string())),
      grid_dimensions: z.tuple([z.number(), z.number()])
    })
  ),
  padavali_attachments: z.array(attachmentRow),
  padavali_schedules: z.array(scheduleRow),
  padavali_sessions: z.array(padavaliSessionRow),
  padavali_gameplay_stats: z.array(attemptStatsRow),
  ai_batch_responses: z.array(
    z.object({
      batch_id: z.string(),
      custom_id: z.string(),
      auto_approved: z.boolean(),
      metadata: batch_metadata_schema.nullable().optional()
    })
  ),
  ai_batches: z.array(
    z.object({
      batch_id: z.string(),
      type: z.enum(['image', 'text', 'object']),
      output_resolved: z.boolean(),
      input_file_id: z.string(),
      output_file_id: z.string().nullable()
    })
  ),
  padavali_redirects: z.array(redirectRow),
  image_assets: z.array(
    z.object({
      id: z.number().int(),
      description: z.string().nullable(),
      width: z.number().int(),
      height: z.number().int(),
      s3_key: z.string(),
      created_at: z.coerce.date()
    })
  ),
  crossword_puzzles: z.array(
    z.object({
      ...listingFields,
      grid_dimensions: z.tuple([z.number(), z.number()]),
      grid_data: z.array(z.array(CrossordPuzzleGridCellSchema)),
      word_list: z.array(CrossWordPuzzleWordSchema)
    })
  ),
  crossword_redirects: z.array(redirectRow).default([]),
  crossword_attachments: z.array(attachmentRow).default([]),
  crossword_sessions: z.array(crosswordSessionRow).default([]),
  crossword_gameplay_stats: z.array(crosswordStatsRow).default([]),
  crossword_schedules: z.array(scheduleRow).default([]),
  tags: z
    .array(
      z.object({
        id: z.number().int(),
        slug: z.string(),
        created_at: z.coerce.date()
      })
    )
    .default([]),
  collections: z
    .array(
      z.object({
        id: z.number().int(),
        uid: z.string(),
        slug: z.string(),
        title: z.string(),
        description: z.string(),
        image_id: z.number().int().nullable(),
        listed: z.boolean(),
        created_at: z.coerce.date(),
        updated_at: nullableDate
      })
    )
    .default([]),
  padavali_puzzle_tags: z.array(tagLinkRow).default([]),
  crossword_puzzle_tags: z.array(tagLinkRow).default([]),
  padavali_collection_items: z.array(collectionItemRow).default([]),
  crossword_collection_items: z.array(collectionItemRow).default([]),
  dvayi_puzzles: dvayiShape.puzzles,
  dvayi_redirects: dvayiShape.redirects,
  dvayi_attachments: dvayiShape.attachments,
  dvayi_sessions: dvayiShape.sessions,
  dvayi_gameplay_stats: dvayiShape.gameplay_stats,
  dvayi_puzzle_tags: dvayiShape.puzzle_tags,
  dvayi_collection_items: dvayiShape.collection_items,
  bhramita_puzzles: bhramitaShape.puzzles,
  bhramita_redirects: bhramitaShape.redirects,
  bhramita_attachments: bhramitaShape.attachments,
  bhramita_sessions: bhramitaShape.sessions,
  bhramita_gameplay_stats: bhramitaShape.gameplay_stats,
  bhramita_puzzle_tags: bhramitaShape.puzzle_tags,
  bhramita_collection_items: bhramitaShape.collection_items,
  surupa_puzzles: surupaShape.puzzles,
  surupa_redirects: surupaShape.redirects,
  surupa_attachments: surupaShape.attachments,
  surupa_sessions: surupaShape.sessions,
  surupa_gameplay_stats: surupaShape.gameplay_stats,
  surupa_puzzle_tags: surupaShape.puzzle_tags,
  surupa_collection_items: surupaShape.collection_items,
  anveshi_puzzles: anveshiShape.puzzles,
  anveshi_redirects: anveshiShape.redirects,
  anveshi_attachments: anveshiShape.attachments,
  anveshi_sessions: anveshiShape.sessions,
  anveshi_gameplay_stats: anveshiShape.gameplay_stats,
  anveshi_puzzle_tags: anveshiShape.puzzle_tags,
  anveshi_collection_items: anveshiShape.collection_items
});

export type LegacyDump = z.infer<typeof LegacyDumpSchema>;
