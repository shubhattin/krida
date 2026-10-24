import { CrossordPuzzleGridCellSchema, PadajalaPuzzleWordSchema } from '~/db/schema_zod';
import { anveshi_puzzle_data_schema } from '~/util/anveshi/data';
import { bhramita_puzzle_data_schema } from '~/util/bhramita/data';
import { dvayi_puzzle_data_schema } from '~/util/dvayi/data';
import { padavali_word_candidate_list_schema } from '~/util/puzzle/word_list';
import { surupa_puzzle_data_schema } from '~/util/surupa/data';
import { zodTypeText } from './zod_type_text';

/**
 * Meaning the DDL cannot carry. `describe_schema.test.ts` fails when a table in
 * `src/db/schema` has neither a note here nor an entry in `HIDDEN_TABLES` — add one with
 * every new table.
 */
export const TABLE_NOTES = new Map<string, string>([
  [
    'puzzles',
    'Every puzzle of every game (kind). listed=false means draft/unlisted; listed=true is public. Game content lives in <kind>_puzzles (same id).'
  ],
  ['padavali_puzzles', 'Padāvalī word-search content; id = puzzles.id'],
  [
    'padajala_puzzles',
    'Padajāla crossword content; id = puzzles.id. word = Latin answer in the grid, word_dev = Devanagari, description = clue'
  ],
  ['dvayi_puzzles', 'Dvayī (match the following) content; id = puzzles.id'],
  ['bhramita_puzzles', 'Bhramitā (jumbled words) content; id = puzzles.id'],
  ['surupa_puzzles', 'Surūpa (spelling corrector) content; id = puzzles.id'],
  ['anveshi_puzzles', 'Anveṣī (multiple-choice quiz) content; id = puzzles.id'],
  ['tags', 'Loose labels shared by all games; the slug is also the display name'],
  ['puzzle_tags', 'Puzzle ↔ tag links'],
  ['collections', 'Curated, ordered sets of puzzles that can mix games; listed=true is public'],
  ['collection_items', 'Collection membership; sort by order_index ascending'],
  ['puzzle_redirects', 'Old slugs of renamed puzzles, kept so old URLs redirect'],
  ['puzzle_attachments', 'Links/videos shown with a puzzle'],
  [
    'puzzle_schedules',
    'Daily-puzzle schedule for every game: the puzzle is the featured one between start_time and end_time'
  ],
  [
    'puzzle_sessions',
    'One row per play start. user_id null = guest. location = page the play started from. script = script the player chose'
  ],
  [
    'attempt_gameplay_stats',
    'Finished-play stats for padavali and the simple games (one per session); time_taken in seconds, accuracy 0–100'
  ],
  [
    'padajala_gameplay_stats',
    'Finished-play stats for padajala (one per session); time_taken in seconds'
  ],
  [
    'image_assets',
    'Generated/uploaded images (puzzle and collection covers); s3_key in the CDN bucket'
  ],
  ['image_system_prompt_templates', 'Editable system prompts for image-prompt generation'],
  ['ai_batches', 'OpenAI Batch API jobs (image/text generation)'],
  ['ai_batch_responses', 'One request inside an OpenAI batch; metadata says what it is for']
]);

/** Tables the agents do not need to know about. */
export const HIDDEN_TABLES = new Set(['agent_chats', 'agent_messages', 'agent_chat_puzzles']);

/** `table.column` → type of the JSON stored in it. */
export const JSONB_COLUMN_TYPES = new Map<string, string>([
  ['padavali_puzzles.word_list', zodTypeText(padavali_word_candidate_list_schema)],
  ['padavali_puzzles.grid_data', 'string[][] (rows of akṣaras)'],
  ['padavali_puzzles.grid_dimensions', '[rows, cols]'],
  ['padajala_puzzles.word_list', zodTypeText(PadajalaPuzzleWordSchema.array())],
  ['padajala_puzzles.grid_data', zodTypeText(CrossordPuzzleGridCellSchema.array().array())],
  ['padajala_puzzles.grid_dimensions', '[rows, cols]'],
  ['dvayi_puzzles.puzzle_data', zodTypeText(dvayi_puzzle_data_schema)],
  ['bhramita_puzzles.puzzle_data', zodTypeText(bhramita_puzzle_data_schema)],
  ['surupa_puzzles.puzzle_data', zodTypeText(surupa_puzzle_data_schema)],
  ['anveshi_puzzles.puzzle_data', zodTypeText(anveshi_puzzle_data_schema)],
  ['ai_batch_responses.metadata', 'object; see app code (batch job bookkeeping)']
]);
