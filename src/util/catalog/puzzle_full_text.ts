import type { PuzzleEntries, PuzzleEntry } from './puzzle_entries';

export type FullTextPuzzle = {
  id: number;
  title: string;
  description: string;
  tags?: { slug: string }[];
  collections?: { title: string }[];
};

const PUZZLE_SEPARATOR = '\n\n------\n\n';

const formatEntry = (entry: PuzzleEntry) =>
  entry.detail?.trim() ? `${entry.text.trim()} : ${entry.detail.trim()}` : entry.text.trim();

/**
 * Plain-text dump of puzzles: a header block per puzzle (title, description,
 * collections, tags) followed by its entries, one per line. Entries not shown to
 * players are left out.
 */
export function formatPuzzlesFullText(
  puzzles: FullTextPuzzle[],
  entriesById: Record<number, PuzzleEntries | undefined>
) {
  return puzzles
    .map((puzzle) => {
      const header = [
        `Title : ${puzzle.title}`,
        `Description : ${puzzle.description}`,
        `Collections: ${(puzzle.collections ?? []).map((c) => c.title).join(', ')}`,
        `Tags: ${(puzzle.tags ?? []).map((t) => t.slug).join(', ')}`
      ].join('\n');
      const lines = (entriesById[puzzle.id]?.entries ?? [])
        .filter((entry) => !entry.inactive)
        .map(formatEntry);
      return lines.length > 0 ? `${header}\n\n${lines.join('\n')}` : header;
    })
    .join(PUZZLE_SEPARATOR);
}
