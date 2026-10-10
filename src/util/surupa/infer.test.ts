import { describe, expect, it } from 'vitest';
import { alignSurupaWord, inferSurupaWord } from './infer';

const word = {
  id: 'w1',
  word: 'लिपि',
  syllables: ['लि', 'पि'],
  alternatives: [[''], []]
};

describe('surupa infer vs editor align', () => {
  it('keeps empty alternative drafts visible while editing', () => {
    expect(alignSurupaWord(word).alternatives).toEqual([[''], []]);
  });

  it('drops empty drafts for play and save', () => {
    expect(inferSurupaWord(word).alternatives).toEqual([[], []]);
  });
});
