import { describe, expect, it } from 'vitest';
import { formatPuzzlesFullText } from './puzzle_full_text';

describe('formatPuzzlesFullText', () => {
  it('formats header blocks and active entries, separated per puzzle', () => {
    const text = formatPuzzlesFullText(
      [
        {
          id: 1,
          title: 'The Path of Yoga',
          description: 'Find the words',
          tags: [{ slug: 'yoga' }, { slug: 'medium' }],
          collections: [{ title: 'Shastras' }]
        },
        { id: 2, title: 'Empty', description: '' }
      ],
      {
        1: {
          label: 'Words',
          entries: [
            { text: 'AHIMSA', detail: 'Non-violence' },
            { text: 'HIDDEN', inactive: true },
            { text: 'OM' }
          ]
        }
      }
    );
    expect(text).toBe(
      [
        'Title : The Path of Yoga',
        'Description : Find the words',
        'Collections: Shastras',
        'Tags: yoga, medium',
        '',
        'AHIMSA : Non-violence',
        'OM',
        '',
        '------',
        '',
        'Title : Empty',
        'Description : ',
        'Collections: ',
        'Tags: '
      ].join('\n')
    );
  });
});
