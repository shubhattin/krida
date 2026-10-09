import { z } from 'zod';
import { createGameItemId } from '~/util/games/ids';
import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';

export const surupa_word_schema = z.object({
  id: z.string().min(1),
  word: z.string(),
  syllables: z.string().array(),
  /** One list of distractors per extracted syllable (same length as `syllables`). */
  alternatives: z.string().array().array()
});

export const surupa_puzzle_data_schema = z.object({
  words: surupa_word_schema.array()
});

export type SurupaWord = z.infer<typeof surupa_word_schema>;
export type SurupaPuzzleData = z.infer<typeof surupa_puzzle_data_schema>;

export const emptySurupaPuzzleData = (): SurupaPuzzleData => ({ words: [] });

export const createSurupaWord = (word = ''): SurupaWord => {
  const syllables = splitDevanagariAksharas(word);
  return {
    id: createGameItemId(),
    word,
    syllables,
    alternatives: syllables.map(() => [])
  };
};
