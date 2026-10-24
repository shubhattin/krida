import { describe, expect, it } from 'vitest';
import {
  anveshiEntries,
  dvayiEntries,
  padajalaEntries,
  padavaliEntries,
  wordEntries
} from './puzzle_entries';

describe('puzzle entries', () => {
  it('marks padavali words not added to the grid as inactive and drops blanks', () => {
    expect(
      padavaliEntries([
        { word: 'राम', added: true },
        { word: 'सीता', added: false },
        { word: '  ', added: true }
      ])
    ).toEqual({
      label: 'Words',
      entries: [
        { text: 'राम', inactive: false },
        { text: 'सीता', inactive: true }
      ]
    });
  });

  it('uses the stored padajala grid word and carries the clue', () => {
    const { entries } = padajalaEntries([
      {
        word: 'rama',
        word_dev: 'राम',
        added: true,
        location: [0, 0],
        direction: 'horizontal',
        description: 'A king'
      }
    ]);
    expect(entries).toEqual([{ text: 'rama', detail: 'A king', inactive: false }]);
  });

  it('lists simple-game words', () => {
    expect(
      wordEntries({ words: [{ id: 'a', word: 'गजः', syllables: ['ग', 'जः'] }] }).entries
    ).toEqual([{ text: 'गजः' }]);
  });

  it('pairs dvayi left items with their matched right item', () => {
    const { label, entries } = dvayiEntries({
      left: [
        { id: 'l1', text: 'one' },
        { id: 'l2', text: 'two' }
      ],
      right: [{ id: 'r1', text: 'एकम्' }],
      matches: [{ leftId: 'l1', rightId: 'r1' }]
    });
    expect(label).toBe('Pairs');
    expect(entries).toEqual([
      { text: 'one', detail: 'एकम्' },
      { text: 'two', detail: undefined }
    ]);
  });

  it('shows the correct anveshi option as the detail', () => {
    const { entries } = anveshiEntries({
      questions: [
        {
          id: 'q',
          prompt: 'Capital?',
          hint: '',
          explanation: '',
          options: [
            { id: 'a', text: 'Delhi' },
            { id: 'b', text: 'Mumbai' }
          ],
          correctOptionId: 'a'
        }
      ]
    });
    expect(entries).toEqual([{ text: 'Capital?', detail: 'Delhi' }]);
  });
});
