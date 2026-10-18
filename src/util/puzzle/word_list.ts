import { z } from 'zod';
import type { PadajalaPuzzleWord } from '~/db/schema_zod';

/** Padavali editor/DB word candidate */
export const padavali_word_candidate_schema = z.object({
  word: z.string(),
  /** When true, the word is included in the public puzzle */
  added: z.boolean().default(true)
});

export type PadavaliWordCandidate = z.infer<typeof padavali_word_candidate_schema>;

export const padavali_word_candidate_list_schema = padavali_word_candidate_schema.array();

/** Missing `added` is treated as enabled (safe default for any stale payloads). */
export function isWordAdded(entry: { added?: boolean }): boolean {
  return entry.added !== false;
}

/** Active (enabled) Padavali words as the public `string[]` contract */
export function padavaliActiveWords(
  wordList: readonly (Pick<PadavaliWordCandidate, 'word'> & { added?: boolean })[]
): string[] {
  return wordList.filter(isWordAdded).map((entry) => entry.word);
}

/** Active padajala entries for public play / listing validation */
export function padajalaActiveWords<T extends { added?: boolean }>(wordList: readonly T[]): T[] {
  return wordList.filter(isWordAdded);
}

/** Compare enabled Padavali word sequences (order-sensitive) */
export function padavaliActiveWordsEqual(
  a: readonly (Pick<PadavaliWordCandidate, 'word'> & { added?: boolean })[],
  b: readonly (Pick<PadavaliWordCandidate, 'word'> & { added?: boolean })[]
): boolean {
  const left = padavaliActiveWords(a);
  const right = padavaliActiveWords(b);
  return left.length === right.length && left.every((word, i) => word === right[i]);
}

/** Project a DB/editor padajala word list down to public-facing active entries */
export function padajalaActiveWordList(
  wordList: readonly PadajalaPuzzleWord[]
): PadajalaPuzzleWord[] {
  return padajalaActiveWords(wordList);
}
