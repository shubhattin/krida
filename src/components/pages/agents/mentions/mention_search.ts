import type { GameKind } from '~/util/catalog/tags';
import { tokenizeSearchQuery } from '~/util/puzzle/search';

export type MentionablePuzzle = {
  id: number;
  kind: GameKind;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
};

export type MentionGameFilter = GameKind | 'all';

type IndexEntry = {
  puzzle: MentionablePuzzle;
  /** Title fields (as written + romanized): a hit here ranks above a description hit. */
  titleFields: string[];
  fields: string[];
};

export type MentionIndex = IndexEntry[];

/** Longest text after `@` still treated as a query (spaces allowed, see `findMentionTrigger`). */
const MAX_QUERY_LENGTH = 48;

/** Lowercase, and drop Latin diacritics so "Krīḍā" and "krida" meet. Indic marks are kept. */
export const foldSearchText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Searchable text per puzzle. `normal` holds the titles and descriptions transliterated from
 * Devanagari to Normal (Latin) — text already in Latin passes through — so "parvati" finds
 * "पार्वती". Until it is ready, only the text as written is searched.
 */
export function buildMentionIndex(
  puzzles: MentionablePuzzle[],
  normal?: { titles: string[]; descriptions: string[] }
): MentionIndex {
  return puzzles.map((puzzle, index) => {
    const titleFields = [puzzle.title, normal?.titles[index] ?? ''].map(foldSearchText);
    return {
      puzzle,
      titleFields,
      fields: [
        ...titleFields,
        puzzle.slug,
        `#${puzzle.id}`,
        foldSearchText(puzzle.description),
        foldSearchText(normal?.descriptions[index] ?? '')
      ].filter(Boolean)
    };
  });
}

function rank(entry: IndexEntry, phrase: string, tokens: string[]): number {
  if (phrase === `#${entry.puzzle.id}` || phrase === String(entry.puzzle.id)) return 400;
  if (entry.titleFields.some((field) => field.startsWith(phrase))) return 300;
  if (entry.titleFields.some((field) => field.includes(phrase))) return 200;
  const slugPhrase = phrase.replace(/\s+/g, '-');
  if (entry.puzzle.slug.startsWith(slugPhrase)) return 150;
  if (entry.puzzle.slug.includes(slugPhrase)) return 100;
  const titleAndSlug = [...entry.titleFields, entry.puzzle.slug];
  if (tokens.every((token) => titleAndSlug.some((field) => field.includes(token)))) return 50;
  return 0;
}

/**
 * Puzzles matching every word of `query` (in any field), best first: the chat's own game
 * ahead of the others, then title hits over slug and description hits, then newest first.
 */
export function searchMentions(
  index: MentionIndex,
  options: {
    query: string;
    game: MentionGameFilter;
    /** The chat's game: listed first when every game is shown. */
    preferGame: GameKind | null;
    /** `kind:id` of puzzles already mentioned. */
    exclude: Set<string>;
    limit: number;
  }
) {
  const tokens = tokenizeSearchQuery(foldSearchText(options.query));
  const phrase = tokens.join(' ');
  const matches: { puzzle: MentionablePuzzle; score: number; order: number }[] = [];
  index.forEach((entry, order) => {
    const { puzzle } = entry;
    if (options.game !== 'all' && puzzle.kind !== options.game) return;
    if (options.exclude.has(`${puzzle.kind}:${puzzle.id}`)) return;
    if (!tokens.every((token) => entry.fields.some((field) => field.includes(token)))) return;
    const gameBoost = options.game === 'all' && puzzle.kind === options.preferGame ? 1000 : 0;
    matches.push({ puzzle, score: gameBoost + (phrase ? rank(entry, phrase, tokens) : 0), order });
  });
  matches.sort((a, b) => b.score - a.score || a.order - b.order);
  return {
    results: matches.slice(0, options.limit).map((match) => match.puzzle),
    total: matches.length
  };
}

/**
 * The `@query` being typed at the caret, if any. `@` must start a word. The query may hold
 * single spaces ("@parvati vivah") but not a leading space, a double space or a line break —
 * the composer also closes the menu once a query with a space stops matching anything.
 */
export function findMentionTrigger(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf('@');
  if (start === -1) return null;
  if (start > 0 && !/\s/.test(before[start - 1]!)) return null;
  const query = before.slice(start + 1);
  if (query.length > MAX_QUERY_LENGTH || /^\s|\s{2}|\n/.test(query)) return null;
  return { start, query };
}
