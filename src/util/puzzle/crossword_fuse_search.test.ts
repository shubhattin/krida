import Fuse from 'fuse.js';
import { describe, expect, it } from 'vitest';

/** Mirrors crossword public archive Fuse config (title + description only). */
function searchCrosswordArchive(
  puzzles: { id: number; title: string; description: string | null }[],
  query: string
) {
  const trimmed = query.trim();
  if (!trimmed) return puzzles;
  const fuse = new Fuse(puzzles, {
    keys: ['title', 'description'],
    threshold: 0.35,
    ignoreLocation: true
  });
  return fuse.search(trimmed).map((r) => r.item);
}

describe('crossword fuse archive search', () => {
  const puzzles = [
    { id: 1, title: 'Sanskrit Roots', description: 'A classic grid about dhatus' },
    { id: 2, title: 'Temple Towns', description: 'Geography of pilgrimage sites' },
    { id: 3, title: 'River Names', description: null }
  ];

  it('returns all puzzles for empty query', () => {
    expect(searchCrosswordArchive(puzzles, '  ')).toHaveLength(3);
  });

  it('fuzzy-matches title typos', () => {
    const hits = searchCrosswordArchive(puzzles, 'sanscrit root');
    expect(hits.map((p) => p.id)).toContain(1);
  });

  it('matches description tokens', () => {
    const hits = searchCrosswordArchive(puzzles, 'pilgrimage');
    expect(hits.map((p) => p.id)).toEqual([2]);
  });
});
