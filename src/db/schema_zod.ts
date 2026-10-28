import { z } from 'zod';
import {
  ai_batch_responses,
  ai_batches,
  anveshi_puzzles,
  attempt_gameplay_stats,
  bhramita_puzzles,
  collection_items,
  collections,
  padajala_gameplay_stats,
  padajala_puzzles,
  dvayi_puzzles,
  image_assets,
  image_system_prompt_templates,
  agent_chats,
  agent_messages,
  agent_chat_puzzles,
  padavali_puzzles,
  puzzle_attachments,
  puzzle_redirects,
  puzzle_schedules,
  puzzle_sessions,
  puzzle_tags,
  puzzles,
  surupa_puzzles,
  tags
} from './schema';
import { createSelectSchema } from 'drizzle-zod';
import { agent_model_id_schema } from '~/agents/models';
import { location_list_enum } from './types';
import { script_list_enum } from '~/state/script_list';
import { batch_metadata_schema } from '~/util/types/ai_batch_metadata';
import { more_hints_schema, word_meanings_schema } from '~/util/ai/ai_content_schemas';

import { game_kind_schema } from '~/util/catalog/tags';
import { padavali_word_candidate_list_schema } from '~/util/puzzle/word_list';
import { dvayi_puzzle_data_schema } from '~/util/dvayi/data';
import { bhramita_puzzle_data_schema } from '~/util/bhramita/data';
import { surupa_puzzle_data_schema } from '~/util/surupa/data';
import { anveshi_puzzle_data_schema } from '~/util/anveshi/data';

const puzzleDates = {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable(),
  last_listed_at: z.coerce.date().optional().nullable()
} as const;

export const PuzzleSchemaZod = createSelectSchema(puzzles, {
  ...puzzleDates,
  kind: game_kind_schema
});

export const PadavaliPuzzleSchemaZod = createSelectSchema(padavali_puzzles, {
  word_list: padavali_word_candidate_list_schema,
  grid_data: z.string().array().array(),
  grid_dimensions: z.tuple([z.number().int().min(3), z.number().int().min(3)]),
  // AI output columns: optional so editor payloads (which never carry them) still parse
  word_meanings: word_meanings_schema.nullable().optional(),
  word_meanings_hash: (schema) => schema.optional(),
  word_meanings_generated_at: z.coerce.date().nullable().optional()
});

export const PadajalaPuzzleWordSchema = z
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
export type PadajalaPuzzleWord = z.infer<typeof PadajalaPuzzleWordSchema>;
export type CrossordPuzzleGridCell = z.infer<typeof CrossordPuzzleGridCellSchema>;
export const CrossordPuzzleSchemaZod = createSelectSchema(padajala_puzzles, {
  /** (m,n) */
  grid_dimensions: z.tuple([z.number().int().min(3), z.number().int().min(3)]),
  word_list: PadajalaPuzzleWordSchema.array(),
  /** mxn grid; blank text cells are boxes, letters are playable */
  grid_data: CrossordPuzzleGridCellSchema.array().array(),
  // AI output columns: optional so editor payloads (which never carry them) still parse
  more_hints: more_hints_schema.nullable().optional(),
  more_hints_hash: (schema) => schema.optional(),
  more_hints_generated_at: z.coerce.date().nullable().optional()
});
const padajalaListingSchema = z.object({
  uid: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  listed: z.boolean(),
  last_listed_at: z.coerce.date().nullable().optional(),
  image_id: z.number().int().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable().optional()
});
/** Joined puzzle the app edits and plays. Listing fields live on `puzzles`. */
export type CrossordPuzzle = z.infer<typeof CrossordPuzzleSchemaZod> &
  z.infer<typeof padajalaListingSchema>;

export const AttemptGamePlayStatsSchemaZod = createSelectSchema(attempt_gameplay_stats, {
  created_at: z.coerce.date()
});

export const PuzzleScheduleSchemaZod = createSelectSchema(puzzle_schedules, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date()
});

export const PuzzleSessionSchemaZod = createSelectSchema(puzzle_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum.nullable().optional(),
  script: script_list_enum.nullable().optional()
});

export const PuzzleAttachmentSchemaZod = createSelectSchema(puzzle_attachments, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const AiBatchResponseSchemaZod = createSelectSchema(ai_batch_responses, {
  metadata: batch_metadata_schema.optional().nullable()
});

export const AiBatchSchemaZod = createSelectSchema(ai_batches);

export const PuzzleRedirectSchemaZod = createSelectSchema(puzzle_redirects, {
  created_at: z.coerce.date(),
  kind: game_kind_schema
});

export const ImageAssetSchemaZod = createSelectSchema(image_assets, {
  created_at: z.coerce.date()
});

export const PadajalaGamePlayStatsSchemaZod = createSelectSchema(padajala_gameplay_stats, {
  created_at: z.coerce.date()
});

export const TagSchemaZod = createSelectSchema(tags, {
  created_at: z.coerce.date()
});

export const CollectionSchemaZod = createSelectSchema(collections, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional().nullable()
});

export const PuzzleTagSchemaZod = createSelectSchema(puzzle_tags);

export const CollectionItemSchemaZod = createSelectSchema(collection_items, {
  created_at: z.coerce.date()
});

export const DvayiPuzzleSchemaZod = createSelectSchema(dvayi_puzzles, {
  puzzle_data: dvayi_puzzle_data_schema
});
export const BhramitaPuzzleSchemaZod = createSelectSchema(bhramita_puzzles, {
  puzzle_data: bhramita_puzzle_data_schema
});
export const SurupaPuzzleSchemaZod = createSelectSchema(surupa_puzzles, {
  puzzle_data: surupa_puzzle_data_schema
});
export const AnveshiPuzzleSchemaZod = createSelectSchema(anveshi_puzzles, {
  puzzle_data: anveshi_puzzle_data_schema
});

export const ImageSystemPromptTemplatesSchemaZod = createSelectSchema(
  image_system_prompt_templates,
  {
    subject: z.enum(['puzzle', 'collection']),
    created_at: z.coerce.date(),
    updated_at: z.coerce.date().optional().nullable()
  }
);

export const AgentChatsSchemaZod = createSelectSchema(agent_chats, {
  model: agent_model_id_schema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  stop_requested_at: z.coerce.date().optional().nullable()
});

export const AgentMessagesSchemaZod = createSelectSchema(agent_messages, {
  role: z.enum(['system', 'user', 'assistant']),
  created_at: z.coerce.date()
});

export const AgentChatPuzzlesSchemaZod = createSelectSchema(agent_chat_puzzles, {
  created_at: z.coerce.date()
});
