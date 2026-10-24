import { describe, expect, it } from 'vitest';
import {
  ALWAYS_VISIBLE_GAMES,
  countWord,
  isAlwaysVisibleGame,
  publicLayoutGames,
  visibleGamesFromCounts
} from './visibility';

const zeroCounts = {
  padavali: 0,
  padajala: 0,
  dvayi: 0,
  bhramita: 0,
  surupa: 0,
  anveshi: 0
};

describe('krida release visibility', () => {
  it('always shows padavali and padajala, even with zero listed puzzles', () => {
    expect(visibleGamesFromCounts(zeroCounts)).toEqual([...ALWAYS_VISIBLE_GAMES]);
  });

  it('reveals a new krida once it has a listed puzzle, keeping GAME_KINDS order', () => {
    expect(visibleGamesFromCounts({ ...zeroCounts, anveshi: 1, dvayi: 3 })).toEqual([
      'padavali',
      'padajala',
      'dvayi',
      'anveshi'
    ]);
  });

  it('marks only the old games as always visible', () => {
    expect(isAlwaysVisibleGame('padavali')).toBe(true);
    expect(isAlwaysVisibleGame('padajala')).toBe(true);
    expect(isAlwaysVisibleGame('dvayi')).toBe(false);
  });

  it('keeps per-game public layouts to always-visible games plus the game itself', () => {
    expect(publicLayoutGames('dvayi')).toEqual(['padavali', 'padajala', 'dvayi']);
    expect(publicLayoutGames('padavali')).toEqual(['padavali', 'padajala']);
    expect(publicLayoutGames('anveshi')).toEqual(['padavali', 'padajala', 'anveshi']);
    expect(publicLayoutGames('bhramita')).toEqual(['padavali', 'padajala', 'bhramita']);
    expect(publicLayoutGames('surupa')).toEqual(['padavali', 'padajala', 'surupa']);
    expect(publicLayoutGames('padajala')).toEqual(['padavali', 'padajala']);
  });

  it('spells out small counts for marketing copy', () => {
    expect(countWord(0)).toBe('zero');
    expect(countWord(1)).toBe('one');
    expect(countWord(2)).toBe('two');
    expect(countWord(6)).toBe('six');
    expect(countWord(12)).toBe('12');
  });
});
