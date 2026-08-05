import { describe, expect, it } from 'vitest';
import { crosswordActiveWords, padavaliActiveWords, padavaliActiveWordsEqual } from './word_list';

describe('padavaliActiveWords', () => {
  it('returns only enabled words in order', () => {
    expect(
      padavaliActiveWords([
        { word: 'राम', added: true },
        { word: 'सीता', added: false },
        { word: 'लक्ष्मण', added: true }
      ])
    ).toEqual(['राम', 'लक्ष्मण']);
  });

  it('treats missing added as enabled', () => {
    expect(padavaliActiveWords([{ word: 'राम' }, { word: 'सीता', added: false }])).toEqual(['राम']);
  });
});

describe('padavaliActiveWordsEqual', () => {
  it('ignores disabled candidates when comparing', () => {
    expect(
      padavaliActiveWordsEqual(
        [
          { word: 'राम', added: true },
          { word: 'सीता', added: false }
        ],
        [
          { word: 'राम', added: true },
          { word: 'हनुमान', added: false }
        ]
      )
    ).toBe(true);
  });

  it('detects enabled word changes', () => {
    expect(
      padavaliActiveWordsEqual([{ word: 'राम', added: true }], [{ word: 'सीता', added: true }])
    ).toBe(false);
  });
});

describe('crosswordActiveWords', () => {
  it('filters to added entries', () => {
    expect(
      crosswordActiveWords([
        { word: 'CAT', added: true },
        { word: 'DOG', added: false }
      ])
    ).toEqual([{ word: 'CAT', added: true }]);
  });

  it('keeps entries when added is missing', () => {
    expect(crosswordActiveWords([{ word: 'CAT' }, { word: 'DOG', added: false }])).toEqual([
      { word: 'CAT' }
    ]);
  });
});
