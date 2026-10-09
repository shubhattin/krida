import { z } from 'zod';
import {
  padavali_puzzles,
  padavali_gameplay_stats,
  padavali_schedules,
  padavali_sessions,
  padavali_attachments,
  ai_batch_responses,
  ai_batches,
  padavali_redirects,
  image_assets,
  crossword_puzzles,
  crossword_redirects,
  crossword_attachments,
  crossword_sessions,
  crossword_gameplay_stats,
  crossword_schedules,
  tags,
  collections,
  padavali_puzzle_tags,
  crossword_puzzle_tags,
  padavali_collection_items,
  crossword_collection_items,
  dvayi_puzzles,
  dvayi_redirects,
  dvayi_attachments,
  dvayi_sessions,
  dvayi_gameplay_stats,
  dvayi_puzzle_tags,
  dvayi_collection_items,
  bhramita_puzzles,
  bhramita_redirects,
  bhramita_attachments,
  bhramita_sessions,
  bhramita_gameplay_stats,
  bhramita_puzzle_tags,
  bhramita_collection_items,
  surupa_puzzles,
  surupa_redirects,
  surupa_attachments,
  surupa_sessions,
  surupa_gameplay_stats,
  surupa_puzzle_tags,
  surupa_collection_items,
  anveshi_puzzles,
  anveshi_redirects,
  anveshi_attachments,
  anveshi_sessions,
  anveshi_gameplay_stats,
  anveshi_puzzle_tags,
  anveshi_collection_items
} from './schema';
import { createSelectSchema } from 'drizzle-zod';
import { location_list_enum } from './types';
import { script_list_enum } from '~/state/script_list';
import { batch_metadata_schema } from '~/util/types/ai_batch_metadata';

import { padavali_word_candidate_list_schema } from '~/util/puzzle/word_list';
import { dvayi_puzzle_data_schema } from '~/util/dvayi/data';
import { bhramita_puzzle_data_schema } from '~/util/bhramita/data';
import { surupa_puzzle_data_schema } from '~/util/surupa/data';
import { anveshi_puzzle_data_schema } from '~/util/anveshi/data';

export const PadavaliPuzzleSchemaZod = createSelectSchema(padavali_puzzles, {
  word_list: padavali_word_candidate_list_schema,
  grid_data: z.string().array().array(),
  grid_dimensions: z.tuple([z.number().int().min(3), z.number().int().min(3)]),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  last_listed_at: z.coerce.date().optional().nullable()
});

export const CrossWordPuzzleWordSchema = z
  .object({
    /** Only word is filled in manually, location and direction are calculated auto */
    word: z.string(),
    /** Actutal sanskrit word in devanagari */
    word_dev: z.string().trim(),
    /** approved to be displayed in word list to the user */
    added: z.boolean().default(true),
    /** starting index in the nxn grid array */
    location: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
    direction: z.enum(['horizontal', 'vertical']),
    /** Clue shown to the player — required when the word is enabled */
    description: z.string().trim()
  })
  .superRefine((entry, ctx) => {
    if (entry.added && entry.word.trim().length > 0 && entry.description.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Clue is required',
        path: ['description']
      });
    }
    if (entry.added && entry.word.trim().length > 0 && entry.word_dev.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Devanagari word is required',
        path: ['word_dev']
      });
    }
  });
export const CrossordPuzzleGridCellSchema = z.object({
  /** Blank text = blocked box; any letter = playable cell */
  text: z.string().max(1).min(0).default(''),
  /** When true, the letter is shown to the player as a prefilled hint */
  is_visible: z.boolean().default(false)
});
export type CrossWordPuzzleWord = z.infer<typeof CrossWordPuzzleWordSchema>;
export type CrossordPuzzleGridCell = z.infer<typeof CrossordPuzzleGridCellSchema>;
export const CrossordPuzzleSchemaZod = createSelectSchema(crossword_puzzles, {
  /** (m,n) */
  grid_dimensions: z.tuple([z.number().int().min(3), z.number().int().min(3)]),
  word_list: CrossWordPuzzleWordSchema.array(),
  /** mxn grid; blank text cells are boxes, letters are playable */
  grid_data: CrossordPuzzleGridCellSchema.array().array(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  last_listed_at: z.coerce.date().optional().nullable()
});
export type CrossordPuzzle = z.infer<typeof CrossordPuzzleSchemaZod>;

export const PadavaliGamePlayStatsSchemaZod = createSelectSchema(padavali_gameplay_stats, {
  created_at: z.coerce.date()
});

export const PadavaliScheduleSchemaZod = createSelectSchema(padavali_schedules, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date()
});

export const PadavaliSessionSchemaZod = createSelectSchema(padavali_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});

export const PadavaliAttachmentSchemaZod = createSelectSchema(padavali_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const AiBatchResponseSchemaZod = createSelectSchema(ai_batch_responses, {
  metadata: batch_metadata_schema.optional().nullable()
});

export const AiBatchSchemaZod = createSelectSchema(ai_batches);

export const PadavaliRedirectSchemaZod = createSelectSchema(padavali_redirects, {
  created_at: z.coerce.date()
});

export const ImageAssetSchemaZod = createSelectSchema(image_assets, {
  created_at: z.coerce.date()
});

export const CrosswordRedirectSchemaZod = createSelectSchema(crossword_redirects, {
  created_at: z.coerce.date()
});

export const CrosswordAttachmentSchemaZod = createSelectSchema(crossword_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const CrosswordSessionSchemaZod = createSelectSchema(crossword_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum.nullable().optional()
});

export const CrosswordGamePlayStatsSchemaZod = createSelectSchema(crossword_gameplay_stats, {
  created_at: z.coerce.date()
});

export const CrosswordScheduleSchemaZod = createSelectSchema(crossword_schedules, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date()
});

export const TagSchemaZod = createSelectSchema(tags, {
  created_at: z.coerce.date()
});

export const CollectionSchemaZod = createSelectSchema(collections, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const PadavaliPuzzleTagSchemaZod = createSelectSchema(padavali_puzzle_tags);

export const CrosswordPuzzleTagSchemaZod = createSelectSchema(crossword_puzzle_tags);

export const PadavaliCollectionItemSchemaZod = createSelectSchema(padavali_collection_items, {
  created_at: z.coerce.date()
});

export const CrosswordCollectionItemSchemaZod = createSelectSchema(crossword_collection_items, {
  created_at: z.coerce.date()
});

const simplePuzzleDates = {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable(),
  last_listed_at: z.coerce.date().optional().nullable()
} as const;

export const DvayiPuzzleSchemaZod = createSelectSchema(dvayi_puzzles, {
  puzzle_data: dvayi_puzzle_data_schema,
  ...simplePuzzleDates
});
export const BhramitaPuzzleSchemaZod = createSelectSchema(bhramita_puzzles, {
  puzzle_data: bhramita_puzzle_data_schema,
  ...simplePuzzleDates
});
export const SurupaPuzzleSchemaZod = createSelectSchema(surupa_puzzles, {
  puzzle_data: surupa_puzzle_data_schema,
  ...simplePuzzleDates
});
export const AnveshiPuzzleSchemaZod = createSelectSchema(anveshi_puzzles, {
  puzzle_data: anveshi_puzzle_data_schema,
  ...simplePuzzleDates
});

export const DvayiRedirectSchemaZod = createSelectSchema(dvayi_redirects, {
  created_at: z.coerce.date()
});
export const BhramitaRedirectSchemaZod = createSelectSchema(bhramita_redirects, {
  created_at: z.coerce.date()
});
export const SurupaRedirectSchemaZod = createSelectSchema(surupa_redirects, {
  created_at: z.coerce.date()
});
export const AnveshiRedirectSchemaZod = createSelectSchema(anveshi_redirects, {
  created_at: z.coerce.date()
});

export const DvayiAttachmentSchemaZod = createSelectSchema(dvayi_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});
export const BhramitaAttachmentSchemaZod = createSelectSchema(bhramita_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});
export const SurupaAttachmentSchemaZod = createSelectSchema(surupa_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});
export const AnveshiAttachmentSchemaZod = createSelectSchema(anveshi_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const DvayiSessionSchemaZod = createSelectSchema(dvayi_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});
export const BhramitaSessionSchemaZod = createSelectSchema(bhramita_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});
export const SurupaSessionSchemaZod = createSelectSchema(surupa_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});
export const AnveshiSessionSchemaZod = createSelectSchema(anveshi_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});

export const DvayiGamePlayStatsSchemaZod = createSelectSchema(dvayi_gameplay_stats, {
  created_at: z.coerce.date()
});
export const BhramitaGamePlayStatsSchemaZod = createSelectSchema(bhramita_gameplay_stats, {
  created_at: z.coerce.date()
});
export const SurupaGamePlayStatsSchemaZod = createSelectSchema(surupa_gameplay_stats, {
  created_at: z.coerce.date()
});
export const AnveshiGamePlayStatsSchemaZod = createSelectSchema(anveshi_gameplay_stats, {
  created_at: z.coerce.date()
});

export const DvayiPuzzleTagSchemaZod = createSelectSchema(dvayi_puzzle_tags);
export const BhramitaPuzzleTagSchemaZod = createSelectSchema(bhramita_puzzle_tags);
export const SurupaPuzzleTagSchemaZod = createSelectSchema(surupa_puzzle_tags);
export const AnveshiPuzzleTagSchemaZod = createSelectSchema(anveshi_puzzle_tags);

export const DvayiCollectionItemSchemaZod = createSelectSchema(dvayi_collection_items, {
  created_at: z.coerce.date()
});
export const BhramitaCollectionItemSchemaZod = createSelectSchema(bhramita_collection_items, {
  created_at: z.coerce.date()
});
export const SurupaCollectionItemSchemaZod = createSelectSchema(surupa_collection_items, {
  created_at: z.coerce.date()
});
export const AnveshiCollectionItemSchemaZod = createSelectSchema(anveshi_collection_items, {
  created_at: z.coerce.date()
});
