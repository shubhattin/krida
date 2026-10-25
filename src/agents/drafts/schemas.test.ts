import { describe, expect, it } from 'vitest';
import { parsePuzzleDraft, type PuzzleDraft } from './schemas';

const meta = {
  title: 'Test puzzle',
  description: 'A test puzzle.',
  slug: 'test-puzzle',
  tags: [],
  collection_ids: [],
  words: ['राम', 'शिव']
};

describe('parsePuzzleDraft padavali grid size', () => {
  it('clamps grids stored under the older limits', () => {
    // SAFETY: stored proposals predate the current limits, so they may fall outside them
    const input = { ...meta, grid_rows: 3, grid_cols: 15 } as PuzzleDraft;
    const parsed = parsePuzzleDraft('padavali', input);
    expect(parsed?.kind === 'padavali' && [parsed.draft.grid_rows, parsed.draft.grid_cols]).toEqual(
      [4, 10]
    );
  });

  it('falls back to the default grid when none was stored', () => {
    // SAFETY: proposals saved before drafts carried a grid size lack these fields
    const parsed = parsePuzzleDraft('padavali', meta as PuzzleDraft);
    expect(parsed?.kind === 'padavali' && [parsed.draft.grid_rows, parsed.draft.grid_cols]).toEqual(
      [6, 6]
    );
  });
});
