import { describe, expect, it } from 'vitest';
import { countDevanagariAksharas } from './devanagari_syllables';

describe('countDevanagariAksharas', () => {
  it.each([
    ['', 0],
    ['   ', 0],
    ['—, 123 abc', 0],
    ['अ', 1],
    ['अआ', 2],
    ['क', 1],
    ['का', 1],
    ['कि', 1],
    ['कृ', 1],
    ['राम', 2],
    ['कलेवरम्', 5],
    ['क्लेशः', 2],
    ['क्त', 1],
    ['कर्म', 2],
    ['शक्ति', 2],
    ['क्ष्म', 1],
    ['म्', 1],
    ['अः', 1],
    ['मं', 1],
    ['शक्तिः', 2],
    ['रामं', 2],
    ['क़', 1],
    ['क़', 1],
    ['क्‍ष', 1],
    ['क्', 1],
    ['ाः', 0]
  ])('counts %s as %i akṣaras', (word, expected) => {
    expect(countDevanagariAksharas(word)).toBe(expected);
  });
});
