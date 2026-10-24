import { describe, expect, it } from 'vitest';
import { checkDraft } from './check_draft';
import type { KindedPuzzleDraft } from './schemas';

const meta = {
  title: 'Test puzzle',
  description: 'A test puzzle.',
  slug: 'test-puzzle',
  tags: [],
  collection_ids: []
};

describe('checkDraft game rules', () => {
  it('rejects dvayi duplicate left-column texts', () => {
    const input: KindedPuzzleDraft = {
      kind: 'dvayi',
      draft: {
        ...meta,
        pairs: [
          { left: 'Rāma', right: 'Sītā' },
          { left: 'Rāma', right: 'Lakṣmaṇa' }
        ]
      }
    };
    expect(checkDraft(input).errors.join('\n')).toContain('left column');
  });

  it('rejects dvayi duplicate right-column texts', () => {
    const input: KindedPuzzleDraft = {
      kind: 'dvayi',
      draft: {
        ...meta,
        pairs: [
          { left: 'Rāma', right: 'Sītā' },
          { left: 'Kṛṣṇa', right: 'Sītā' }
        ]
      }
    };
    expect(checkDraft(input).errors.join('\n')).toContain('right column');
  });

  it('rejects surupa duplicate words', () => {
    const word = {
      word: 'राम',
      aksharas: [
        { akshara: 'रा', alternatives: ['रि'] },
        { akshara: 'म', alternatives: ['न'] }
      ]
    };
    const input: KindedPuzzleDraft = { kind: 'surupa', draft: { ...meta, words: [word, word] } };
    expect(checkDraft(input).errors.join('\n')).toContain('appears more than once');
  });

  it('rejects a surupa akṣara left without distractors', () => {
    const input: KindedPuzzleDraft = {
      kind: 'surupa',
      draft: {
        ...meta,
        words: [
          {
            word: 'राम',
            aksharas: [
              { akshara: 'रा', alternatives: [''] },
              { akshara: 'म', alternatives: ['न'] }
            ]
          }
        ]
      }
    };
    expect(checkDraft(input).errors.join('\n')).toContain('distractor');
  });

  it('rejects padavali words that overflow the grid', () => {
    const input: KindedPuzzleDraft = {
      kind: 'padavali',
      draft: {
        ...meta,
        words: ['राम', 'कृष्ण', 'शिव', 'विष्णु', 'गणेश'],
        grid_rows: 3,
        grid_cols: 3
      }
    };
    expect(checkDraft(input).errors.join('\n')).toContain('akṣaras');
  });

  it('warns on a tight padavali fit without failing', () => {
    const input: KindedPuzzleDraft = {
      kind: 'padavali',
      draft: {
        ...meta,
        words: ['राम', 'कृष्ण', 'शिव', 'विष्णु'],
        grid_rows: 3,
        grid_cols: 3
      }
    };
    const { errors, warnings } = checkDraft(input, undefined, {
      item_count: 4,
      grid_rows: 3,
      grid_cols: 3
    });
    expect(errors).toEqual([]);
    expect(warnings.join('\n')).toContain('tight fit');
  });

  it('passes a padavali puzzle that matches the chat defaults', () => {
    const input: KindedPuzzleDraft = {
      kind: 'padavali',
      draft: {
        ...meta,
        words: ['राम', 'कृष्ण', 'शिव', 'विष्णु', 'गणेश', 'सूर्य', 'चन्द्र', 'अग्नि', 'वायु'],
        grid_rows: 6,
        grid_cols: 6
      }
    };
    const { errors, warnings } = checkDraft(input);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('warns when the draft ignores the chat starting options', () => {
    const input: KindedPuzzleDraft = {
      kind: 'padavali',
      draft: { ...meta, words: ['राम', 'कृष्ण', 'शिव'], grid_rows: 6, grid_cols: 6 }
    };
    const { errors, warnings } = checkDraft(input, undefined, {
      item_count: 9,
      grid_rows: 4,
      grid_cols: 4
    });
    expect(errors).toEqual([]);
    expect(warnings.join('\n')).toContain('9 words');
    expect(warnings.join('\n')).toContain('4×4');
  });

  it('warns on latin anveshi options when the devanagari default is on', () => {
    const input: KindedPuzzleDraft = {
      kind: 'anveshi',
      draft: {
        ...meta,
        questions: [
          {
            prompt: 'Who is who?',
            hint: '',
            explanation: 'Because.',
            options: ['Rama', 'Krishna', 'Shiva', 'Vishnu'],
            correct_option_index: 0
          }
        ]
      }
    };
    expect(checkDraft(input).warnings.join('\n')).toContain('Devanagari');
  });

  it('stays quiet for devanagari anveshi options under matching defaults', () => {
    const input: KindedPuzzleDraft = {
      kind: 'anveshi',
      draft: {
        ...meta,
        questions: [
          {
            prompt: 'Who is who?',
            hint: '',
            explanation: 'Because.',
            options: ['रामः', 'कृष्णः', 'शिवः', 'विष्णुः'],
            correct_option_index: 0
          }
        ]
      }
    };
    const { errors, warnings } = checkDraft(input, undefined, {
      item_count: 1,
      choices: 4,
      options_devanagari: true
    });
    expect(errors).toEqual([]);
    expect(warnings.join('\n')).not.toContain('Devanagari');
  });
});
