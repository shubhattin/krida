import { describe, expect, it } from 'vitest';
import { findAllTraversals } from './puzzle_tools';
import { SAMPLE_DATA } from './sample_puzzle_data';

describe('findAllTraversals', () => {
  const { grid_data, grid_dimensions, word_list, word_list_occurences } = SAMPLE_DATA[0];
  const traversalsMap = findAllTraversals(grid_data, grid_dimensions, word_list);

  it('should have a traversal array for each word index', () => {
    expect(traversalsMap.size).toBe(word_list.length);
  });

  it('should find exactly one traversal for each word', () => {
    word_list.forEach((_, idx) => {
      const traversals = traversalsMap.get(idx);
      expect(traversals).toBeDefined();
      expect(traversals?.length).toBe(word_list_occurences[idx]);
    });
  });
});
