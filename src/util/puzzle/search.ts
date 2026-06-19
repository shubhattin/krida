/** Split a search query into lowercase word tokens. */
export function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/** Escape `%`, `_`, and `\` for safe use inside SQL ILIKE patterns. */
export function escapeIlikeToken(token: string): string {
  return token.replace(/[%_\\]/g, '\\$&');
}

/**
 * True when every query token appears as a case-insensitive substring in at least
 * one field (AND across tokens, OR across fields). Unlike phrase search, tokens
 * need not be adjacent — e.g. "ganesh mumbai" matches "ganesh of mumbai".
 */
export function matchesWordSearch(fields: (string | null | undefined)[], query: string): boolean {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return true;

  const searchable = fields
    .filter((field): field is string => typeof field === 'string' && field.length > 0)
    .map((field) => field.toLowerCase());

  if (searchable.length === 0) return false;

  return tokens.every((token) => searchable.some((text) => text.includes(token)));
}

export type WordSearchablePuzzle = {
  title: string;
  title_normal?: string | null;
  description?: string | null;
  description_original?: string | null;
};

export function matchesPuzzleWordSearch(puzzle: WordSearchablePuzzle, query: string): boolean {
  return matchesWordSearch(
    [puzzle.title, puzzle.title_normal, puzzle.description, puzzle.description_original],
    query
  );
}
