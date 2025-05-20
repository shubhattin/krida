import { z } from 'zod';
import { word_puzzles } from './schema';
import { createSelectSchema } from 'drizzle-zod';

export const WordPuzzleSchemaZod = createSelectSchema(word_puzzles, {
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().optional()
});
