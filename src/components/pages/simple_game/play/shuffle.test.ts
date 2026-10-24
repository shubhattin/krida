import { describe, expect, it } from 'vitest';
import { shuffleFewInPlace } from './shuffle';

const inPlaceCount = (list: number[]) => list.filter((value, index) => value === index).length;

describe('shuffleFewInPlace', () => {
  it('never leaves an item in place for short lists', () => {
    for (let run = 0; run < 300; run++) {
      for (const size of [2, 3]) {
        const items = Array.from({ length: size }, (_, index) => index);
        const next = shuffleFewInPlace(items, (value, index) => value === index);
        expect(inPlaceCount(next)).toBe(0);
        expect(next.toSorted()).toEqual(items);
      }
    }
  });

  it('leaves at most one item in place for longer lists', () => {
    for (let run = 0; run < 300; run++) {
      const items = Array.from({ length: 6 }, (_, index) => index);
      const next = shuffleFewInPlace(items, (value, index) => value === index);
      expect(inPlaceCount(next)).toBeLessThanOrEqual(1);
      expect(next.toSorted((a, b) => a - b)).toEqual(items);
    }
  });
});
