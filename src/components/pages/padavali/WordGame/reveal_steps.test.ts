import { describe, expect, it } from 'vitest';
import type { CellPosition } from './game_state';
import { canRevealMore, clueFromMeaning, nextRevealState } from './reveal_steps';

const path = (n: number): CellPosition[] =>
  Array.from({ length: n }, (_, i) => ({ row: 0, col: i }));
const paths = { abc: path(3), de: path(2) };
const pick = (w: string) => Object.entries(paths).find(([k]) => k === w)?.[1] ?? null;
const first = () => 0;

describe('nextRevealState', () => {
  it('starts a word at its first akṣara', () => {
    const s = nextRevealState(null, ['abc', 'de'], pick, first)!;
    expect(s.word).toBe('abc');
    expect(s.cells).toHaveLength(1);
    expect(s.animateFrom).toBe(0);
  });

  it('grows by one akṣara and stops one short of the full word', () => {
    const s1 = nextRevealState(null, ['abc'], pick, first)!;
    const s2 = nextRevealState(s1, ['abc'], pick, first)!;
    expect(s2.cells).toHaveLength(2);
    expect(s2.animateFrom).toBe(1);
    expect(canRevealMore(s2, ['abc'])).toBe(false);
    expect(nextRevealState(s2, ['abc'], pick, first)).toBeNull();
  });

  it('moves to another word once the target is exhausted', () => {
    const s1 = nextRevealState(null, ['de', 'abc'], pick, first)!;
    expect(s1.word).toBe('de');
    const s2 = nextRevealState(s1, ['de', 'abc'], pick, first)!;
    expect(s2.word).toBe('abc');
    expect(s2.cells).toHaveLength(1);
  });

  it('starts fresh when the target was found', () => {
    const s1 = nextRevealState(null, ['abc', 'de'], pick, first)!;
    const s2 = nextRevealState(s1, ['de'], pick, first)!;
    expect(s2.word).toBe('de');
  });

  it('reveals nothing when no words remain', () => {
    expect(nextRevealState(null, [], pick, first)).toBeNull();
  });
});

describe('clueFromMeaning', () => {
  it('drops the leading word and keeps the first sentence', () => {
    expect(
      clueFromMeaning('Āsana — a steady and comfortable posture. Used before meditation.')
    ).toBe('A steady and comfortable posture.');
  });

  it('keeps meanings without a dash', () => {
    expect(clueFromMeaning('breath control')).toBe('Breath control');
  });
});
