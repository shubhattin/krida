import { customAlphabet } from 'nanoid';

const createItemId = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  10
);

/** Stable ids for JSONB rows (pairs, words, questions, options). */
export const createGameItemId = () => createItemId();
