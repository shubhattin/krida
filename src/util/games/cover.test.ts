import { describe, expect, it } from 'vitest';
import { anveshiCoverWords } from '~/util/anveshi/cover';
import { bhramitaCoverWords } from '~/util/bhramita/cover';
import { dvayiCoverWords } from '~/util/dvayi/cover';
import { surupaCoverWords } from '~/util/surupa/cover';

describe('cover prompt context', () => {
  it('dvayi pairs each match as "left — right", skipping unmatched and blank items', () => {
    expect(
      dvayiCoverWords({
        left: [
          { id: 'l1', text: 'राम' },
          { id: 'l2', text: 'शिव' },
          { id: 'l3', text: ' ' }
        ],
        right: [
          { id: 'r1', text: 'सीता' },
          { id: 'r2', text: 'पार्वती' },
          { id: 'r3', text: 'x' }
        ],
        matches: [
          { leftId: 'l2', rightId: 'r2' },
          { leftId: 'l1', rightId: 'r1' },
          { leftId: 'l3', rightId: 'r3' }
        ]
      })
    ).toEqual(['शिव — पार्वती', 'राम — सीता']);
  });

  it('bhramita uses the trimmed words', () => {
    expect(
      bhramitaCoverWords({
        words: [
          { id: 'a', word: ' पाणिनिः ', syllables: [] },
          { id: 'b', word: '', syllables: [] }
        ]
      })
    ).toEqual(['पाणिनिः']);
  });

  it('surupa never leaks the misspelt alternatives', () => {
    expect(
      surupaCoverWords({
        words: [{ id: 'a', word: 'विघ्नेशः', syllables: [], alternatives: [['वै'], ['ग्ने'], ['सः']] }]
      })
    ).toEqual(['विघ्नेशः']);
  });

  it('anveshi pairs question with its correct answer and caps at eight', () => {
    const questions = Array.from({ length: 10 }, (_, index) => ({
      id: `q${index}`,
      prompt: `Q${index}`,
      hint: '',
      explanation: '',
      options: [
        { id: `q${index}a`, text: 'right' },
        { id: `q${index}b`, text: 'wrong' }
      ],
      correctOptionId: `q${index}a`
    }));
    const words = anveshiCoverWords({ questions });
    expect(words).toHaveLength(8);
    expect(words[0]).toBe('Q0 → right');
  });
});
