import crypto from 'node:crypto';
import { padajalaActiveWords, padavaliActiveWords } from '~/util/puzzle/word_list';
import { WORD_MEANINGS_PROMPT_VERSION } from './word_meanings';
import { MORE_HINTS_PROMPT_VERSION, type MoreHintsInputWord } from './more_hints';

export type HashableJson =
  | string
  | number
  | boolean
  | null
  | HashableJson[]
  | { [key: string]: HashableJson };

/**
 * sha256 (hex) of the canonical JSON of `inputs`. JSON keeps field boundaries, so
 * `["ab", "c"]` and `["a", "bc"]` never hash alike the way plain concatenation would.
 */
export const hashAiInputs = (inputs: HashableJson): string =>
  crypto.createHash('sha256').update(JSON.stringify(inputs)).digest('hex');

export type WordMeaningsInputs = {
  title: string;
  description: string;
  word_list: { word: string; added?: boolean }[];
};

/** Hash of everything padavali word meanings are generated from (inactive words ignored). */
export const wordMeaningsInputHash = ({ title, description, word_list }: WordMeaningsInputs) =>
  hashAiInputs({
    version: WORD_MEANINGS_PROMPT_VERSION,
    title,
    description,
    words: padavaliActiveWords(word_list)
  });

export type MoreHintsInputs = {
  title: string;
  description: string;
  word_list: MoreHintsInputWord[];
};

/** Hash of everything padajala more hints are generated from (placement and inactive words ignored). */
export const moreHintsInputHash = ({ title, description, word_list }: MoreHintsInputs) =>
  hashAiInputs({
    version: MORE_HINTS_PROMPT_VERSION,
    title,
    description,
    words: padajalaActiveWords(word_list).map(({ word, description: clue }) => [word, clue])
  });
