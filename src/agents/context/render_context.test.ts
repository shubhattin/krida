import { describe, expect, it } from 'vitest';
import { renderReferencedPuzzle } from './render_context';

describe('renderReferencedPuzzle', () => {
  it('wraps the puzzle block with its game, id and mention token', () => {
    const text = renderReferencedPuzzle({
      id: 26,
      slug: 'ganesh-pancha-ratnam',
      title: 'गणेश-पंचरत्न-वर्णनम्',
      description: 'Names\nfrom the stotra',
      listed: true,
      tags: ['ganesha'],
      collection_ids: [3],
      content: {
        kind: 'padavali',
        grid_dimensions: [10, 10],
        word_list: [
          { word: 'गणेशः', added: true },
          { word: 'विनायकः', added: false }
        ]
      }
    });
    expect(text).toBe(
      [
        '<referenced_puzzle game="padavali" id="26" mention="@ganesh-pancha-ratnam">',
        '#26 [listed] slug=ganesh-pancha-ratnam',
        '  title: गणेश-पंचरत्न-वर्णनम्',
        '  description: Names from the stotra',
        '  tags: ganesha',
        '  collections: #3',
        '  grid: 10×10',
        '  words: गणेशः',
        '</referenced_puzzle>'
      ].join('\n')
    );
  });
});
