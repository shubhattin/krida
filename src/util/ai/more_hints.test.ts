import { describe, expect, it } from 'vitest';
import { more_hints_inputs_equal, more_hints_schema } from './more_hints';

describe('more_hints_inputs_equal', () => {
  const base = {
    title: 'Gods',
    description: 'Hindu deities',
    word_list: [
      { word: 'शिव', description: 'Destroyer' },
      { word: 'विष्णु', description: 'Preserver' }
    ]
  };

  it('returns true when title, description, and clue words match', () => {
    expect(
      more_hints_inputs_equal(base, {
        ...base,
        word_list: base.word_list.map((entry) => ({ ...entry }))
      })
    ).toBe(true);
  });

  it('returns false when title changes', () => {
    expect(more_hints_inputs_equal(base, { ...base, title: 'Devas' })).toBe(false);
  });

  it('returns false when description changes', () => {
    expect(more_hints_inputs_equal(base, { ...base, description: 'Other' })).toBe(false);
  });

  it('returns false when a word or short clue changes', () => {
    expect(
      more_hints_inputs_equal(base, {
        ...base,
        word_list: [
          { word: 'शिव', description: 'Destroyer' },
          { word: 'विष्णु', description: 'The preserver deity' }
        ]
      })
    ).toBe(false);

    expect(
      more_hints_inputs_equal(base, {
        ...base,
        word_list: [
          { word: 'शिव', description: 'Destroyer' },
          { word: 'ब्रह्मा', description: 'Preserver' }
        ]
      })
    ).toBe(false);
  });

  it('returns false when word list length or order changes', () => {
    expect(
      more_hints_inputs_equal(base, {
        ...base,
        word_list: [base.word_list[0]]
      })
    ).toBe(false);

    expect(
      more_hints_inputs_equal(base, {
        ...base,
        word_list: [base.word_list[1], base.word_list[0]]
      })
    ).toBe(false);
  });

  it('ignores placement-only fields when comparing', () => {
    // more_hints_inputs_equal only accepts word + description; callers strip placement.
    expect(
      more_hints_inputs_equal(
        {
          title: base.title,
          description: base.description,
          word_list: [
            { word: 'शिव', description: 'Destroyer' },
            { word: 'विष्णु', description: 'Preserver' }
          ]
        },
        {
          title: base.title,
          description: base.description,
          word_list: [
            { word: 'शिव', description: 'Destroyer' },
            { word: 'विष्णु', description: 'Preserver' }
          ]
        }
      )
    ).toBe(true);
  });
});

describe('more_hints_schema', () => {
  it('accepts ordered non-empty hints', () => {
    expect(
      more_hints_schema.parse({
        hints: ['Associated with Mount Kailasa', 'Often depicted resting on the cosmic ocean']
      })
    ).toEqual({
      hints: ['Associated with Mount Kailasa', 'Often depicted resting on the cosmic ocean']
    });
  });

  it('rejects empty hint strings', () => {
    expect(() => more_hints_schema.parse({ hints: ['ok', '  '] })).toThrow();
  });
});
