import { z } from 'zod';
import { createGameItemId } from '~/util/games/ids';
import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';

export const bhramita_word_schema = z.object({
  id: z.string().min(1),
  word: z.string(),
  /** Inferred Devanagari akṣaras — persisted so play/load does not re-split. */
  syllables: z.string().array()
});

export const bhramita_puzzle_data_schema = z.object({
  words: bhramita_word_schema.array()
});

export type BhramitaWord = z.infer<typeof bhramita_word_schema>;
export type BhramitaPuzzleData = z.infer<typeof bhramita_puzzle_data_schema>;

export const emptyBhramitaPuzzleData = (): BhramitaPuzzleData => ({ words: [] });

export const createBhramitaWord = (word = ''): BhramitaWord => ({
  id: createGameItemId(),
  word,
  syllables: splitDevanagariAksharas(word)
});
