import Fuse from 'fuse.js';
import { describe, expect, it } from 'vitest';

/** Mirrors padajala public archive Fuse config (title + description only). */
function searchPadajalaArchive(
  puzzles: { id: number; title: string; description: string }[],
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

describe('padajala fuse archive search', () => {
  const puzzles = [
    { id: 1, title: 'Sanskrit Roots', description: 'A classic grid about dhatus' },
    { id: 2, title: 'Temple Towns', description: 'Geography of pilgrimage sites' },
    { id: 3, title: 'River Names', description: '' }
  ];

  it('returns all puzzles for empty query', () => {
    expect(searchPadajalaArchive(puzzles, '  ')).toHaveLength(3);
  });

  it('fuzzy-matches title typos', () => {
    const hits = searchPadajalaArchive(puzzles, 'sanscrit root');
    expect(hits.map((p) => p.id)).toContain(1);
  });

  it('matches description tokens', () => {
    const hits = searchPadajalaArchive(puzzles, 'pilgrimage');
    expect(hits.map((p) => p.id)).toEqual([2]);
  });
});
