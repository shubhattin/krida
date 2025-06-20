import { z } from 'zod';
import {
  word_puzzles,
  puzzle_gameplay_stats,
  puzzle_game_schedules,
  puzzle_gameplay_sessions
} from './schema';
import { createSelectSchema } from 'drizzle-zod';
import { location_list_enum } from './types';
import { script_list_enum } from '~/state/script_list';

export const WordPuzzleSchemaZod = createSelectSchema(word_puzzles, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional()
});

export const PuzzleGamePlayStatsSchemaZod = createSelectSchema(puzzle_gameplay_stats, {
  created_at: z.coerce.date()
});

export const PuzzleGameScheduleSchemaZod = createSelectSchema(puzzle_game_schedules, {
  created_at: z.coerce.date(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date()
});

export const PuzzleGamePlaySessionSchemaZod = createSelectSchema(puzzle_gameplay_sessions, {
  created_at: z.coerce.date(),
  location: location_list_enum,
  script: script_list_enum.nullable().optional()
});
