import { z } from 'zod';
import type { HubPuzzle } from './hub_puzzles';

export const LIBRARY_GAMES = ['all', 'padavali', 'crossword'] as const;
export type LibraryGameFilter = (typeof LIBRARY_GAMES)[number];

export const LIBRARY_SORTS = ['newest', 'az'] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export const LIBRARY_PAGE_SIZE = 12;

export const librarySearchSchema = z.object({
  game: z.enum(LIBRARY_GAMES).catch('all').default('all'),
  q: z.string().max(200).optional().catch(undefined),
  tags: z.string().max(400).optional().catch(undefined),
  tag: z.string().max(80).optional().catch(undefined),
  sort: z.enum(LIBRARY_SORTS).catch('newest').default('newest'),
  page: z.coerce.number().int().min(1).catch(1).default(1)
});

export type LibrarySearch = z.infer<typeof librarySearchSchema>;

export function libraryTagList(search: LibrarySearch): string[] {
  const fromCsv =
    search.tags
      ?.split(',')
      .map((tag) => tag.trim())
      .filter(Boolean) ?? [];
  if (search.tag && !fromCsv.includes(search.tag)) fromCsv.push(search.tag);
  return fromCsv.slice(0, 20);
}

export function serializeLibraryTags(slugs: string[]): string | undefined {
  return slugs.length > 0 ? slugs.join(',') : undefined;
}

/** Drop defaults so URLs stay short. */
export function compactLibrarySearch(search: LibrarySearch) {
  return {
    game: search.game === 'all' ? undefined : search.game,
    q: search.q || undefined,
    tags: search.tags || undefined,
    sort: search.sort === 'newest' ? undefined : search.sort,
    page: search.page > 1 ? search.page : undefined
  };
}

export function libraryHasFilters(search: LibrarySearch): boolean {
  return search.game !== 'all' || Boolean(search.q) || libraryTagList(search).length > 0;
}

export function interleaveByGame(puzzles: HubPuzzle[]): HubPuzzle[] {
  const padavali: HubPuzzle[] = [];
  const crossword: HubPuzzle[] = [];
  for (const puzzle of puzzles) {
    if (puzzle.game === 'padavali') padavali.push(puzzle);
    else crossword.push(puzzle);
  }
  const mixed: HubPuzzle[] = [];
  const max = Math.max(padavali.length, crossword.length);
  for (let i = 0; i < max; i++) {
    const left = padavali[i];
    const right = crossword[i];
    if (left) mixed.push(left);
    if (right) mixed.push(right);
  }
  return mixed;
}

export function sortLibraryPuzzles(
  puzzles: HubPuzzle[],
  sort: LibrarySort,
  preserveOrder: boolean
): HubPuzzle[] {
  if (sort === 'az') {
    return puzzles.toSorted((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
    );
  }
  if (preserveOrder) return puzzles;
  return interleaveByGame(puzzles);
}

export function visiblePageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) result.push('ellipsis');
    result.push(sorted[i]!);
  }
  return result;
}
