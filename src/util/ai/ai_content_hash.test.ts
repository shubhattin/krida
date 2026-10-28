import { describe, expect, it } from 'vitest';
import type { PadajalaPuzzleWord } from '~/db/schema_zod';
import { hashAiInputs, moreHintsInputHash, wordMeaningsInputHash } from './ai_content_hash';

const padavali = {
  title: 'Devī',
  description: 'Names of the goddess',
  word_list: [
    { word: 'शक्ति', added: true },
    { word: 'दुर्गा', added: true }
  ]
};

const clue = (word: string, description: string, added = true): PadajalaPuzzleWord => ({
  word,
  word_dev: word,
  description,
  added,
  location: [0, 0],
  direction: 'horizontal'
});

const padajala = {
  title: 'Gods',
  description: 'Deities',
  word_list: [clue('gaṇeśa', 'Remover of obstacles'), clue('śiva', 'The auspicious one')]
};

describe('hashAiInputs', () => {
  it('is a stable sha256 hex digest', () => {
    expect(hashAiInputs(['a'])).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAiInputs(['a'])).toBe(hashAiInputs(['a']));
  });

  it('keeps field boundaries', () => {
    expect(hashAiInputs(['ab', 'c'])).not.toBe(hashAiInputs(['a', 'bc']));
  });
});

describe('wordMeaningsInputHash', () => {
  const base = wordMeaningsInputHash(padavali);

  it('changes with title, description, words and word order', () => {
    expect(wordMeaningsInputHash({ ...padavali, title: 'Devi' })).not.toBe(base);
    expect(wordMeaningsInputHash({ ...padavali, description: '' })).not.toBe(base);
    expect(
      wordMeaningsInputHash({ ...padavali, word_list: [...padavali.word_list].reverse() })
    ).not.toBe(base);
  });

  it('ignores inactive words', () => {
    expect(
      wordMeaningsInputHash({
        ...padavali,
        word_list: [...padavali.word_list, { word: 'काली', added: false }]
      })
    ).toBe(base);
  });
});

describe('moreHintsInputHash', () => {
  const base = moreHintsInputHash(padajala);

  it('changes with clues', () => {
    expect(
      moreHintsInputHash({
        ...padajala,
        word_list: [padajala.word_list[0]!, clue('śiva', 'Lord of Kailāsa')]
      })
    ).not.toBe(base);
  });

  it('ignores placement and inactive words', () => {
    const moved = clue('gaṇeśa', 'Remover of obstacles');
    moved.location = [3, 4];
    expect(
      moreHintsInputHash({
        ...padajala,
        word_list: [moved, padajala.word_list[1]!, clue('viṣṇu', 'The preserver', false)]
      })
    ).toBe(base);
  });
});
