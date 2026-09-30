import type { CrosswordListedPuzzle } from '~/components/pages/cross_word/CrosswordPreviewCard';
import type { DisplayPuzzle } from '~/components/pages/padavali/listed_puzzle_display';
import type {
  ListedCollectionItem,
  ListedCollectionsType
} from '~/util/cache.server/collection_cache';
import type { GameKind, PublicTag } from '~/util/catalog/tags';
import { matchesWordSearch } from '~/util/puzzle/search';
import { puzzleHref } from './hub_games';

type HubPuzzleBase = {
  /** Unique across games, e.g. `padavali:12`. */
  key: string;
  id: number;
  slug: string;
  title: string;
  description: string;
  image: DisplayPuzzle['image'];
  tags: PublicTag[];
  href: string;
};

/** One listed puzzle from any game, keeping the original row for the game's own card. */
export type HubPuzzle =
  | (HubPuzzleBase & { game: 'padavali'; source: DisplayPuzzle })
  | (HubPuzzleBase & { game: 'crossword'; source: CrosswordListedPuzzle });

export const hubPuzzleKey = (game: GameKind, id: number) => `${game}:${id}`;

export function toHubPuzzles(
  padavali: DisplayPuzzle[],
  crossword: CrosswordListedPuzzle[]
): HubPuzzle[] {
  return [
    ...padavali.map((puzzle): HubPuzzle => ({
      game: 'padavali',
      key: hubPuzzleKey('padavali', puzzle.id),
      id: puzzle.id,
      slug: puzzle.slug,
      title: puzzle.title,
      description: puzzle.description,
      image: puzzle.image,
      tags: puzzle.tags,
      href: puzzleHref('padavali', puzzle.slug),
      source: puzzle
    })),
    ...crossword.map((puzzle): HubPuzzle => ({
      game: 'crossword',
      key: hubPuzzleKey('crossword', puzzle.id),
      id: puzzle.id,
      slug: puzzle.slug,
      title: puzzle.title,
      description: puzzle.description,
      image: puzzle.image,
      tags: puzzle.tags,
      href: puzzleHref('crossword', puzzle.slug),
      source: puzzle
    }))
  ];
}

/**
 * Resolve a collection's ordered items against the live puzzle list, so Padavali
 * titles follow the selected script. Falls back to the cached collection row.
 */
export function resolveCollectionItems(
  items: ListedCollectionItem[],
  byKey: Map<string, HubPuzzle>
): HubPuzzle[] {
  return items
    .toSorted((a, b) => a.order_index - b.order_index || a.puzzle_id - b.puzzle_id)
    .map((item) => {
      const found = byKey.get(hubPuzzleKey(item.game, item.puzzle_id));
      if (found) return found;
      const base = {
        key: hubPuzzleKey(item.game, item.puzzle_id),
        id: item.puzzle_id,
        slug: item.slug,
        title: item.title,
        description: item.description,
        image: item.image,
        tags: [],
        href: puzzleHref(item.game, item.slug)
      };
      return item.game === 'padavali'
        ? {
            ...base,
            game: 'padavali' as const,
            source: {
              id: item.puzzle_id,
              slug: item.slug,
              title: item.title,
              description: item.description,
              description_original: item.description,
              title_normal: item.title,
              image: item.image,
              tags: []
            }
          }
        : {
            ...base,
            game: 'crossword' as const,
            source: {
              id: item.puzzle_id,
              slug: item.slug,
              title: item.title,
              description: item.description,
              image: item.image,
              tags: []
            }
          };
    });
}

export function collectionGames(collection: ListedCollectionsType[number]): GameKind[] {
  const games = new Set(collection.items.map((item) => item.game));
  return (['padavali', 'crossword'] as const).filter((game) => games.has(game));
}

export type HubPuzzleFilter = {
  game?: GameKind | 'all';
  /** Tag slugs — a puzzle matches when it carries any of them. */
  tags?: string[];
  query?: string;
};

export function filterHubPuzzles(puzzles: HubPuzzle[], filter: HubPuzzleFilter): HubPuzzle[] {
  const game = filter.game ?? 'all';
  const tags = filter.tags ?? [];
  const query = filter.query ?? '';
  return puzzles.filter((puzzle) => {
    if (game !== 'all' && puzzle.game !== game) return false;
    if (tags.length > 0 && !puzzle.tags.some((tag) => tags.includes(tag.slug))) return false;
    const fields =
      puzzle.game === 'padavali'
        ? [
            puzzle.source.title,
            puzzle.source.title_normal,
            puzzle.source.description,
            puzzle.source.description_original
          ]
        : [puzzle.title, puzzle.description];
    return matchesWordSearch(fields, query);
  });
}

/** Tags sorted by how many listed puzzles (across games) carry them. */
export function tagsFromTagLists(rows: { tags: PublicTag[] }[]): (PublicTag & { count: number })[] {
  const bySlug = new Map<string, PublicTag & { count: number }>();
  for (const row of rows) {
    for (const tag of row.tags) {
      const existing = bySlug.get(tag.slug);
      if (existing) existing.count += 1;
      else bySlug.set(tag.slug, { ...tag, count: 1 });
    }
  }
  return [...bySlug.values()].toSorted((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

export function tagsByPopularity(puzzles: HubPuzzle[]): (PublicTag & { count: number })[] {
  return tagsFromTagLists(puzzles);
}

export function firstCollectionItem(
  items: ListedCollectionItem[]
): ListedCollectionItem | undefined {
  return items.toSorted((a, b) => a.order_index - b.order_index || a.puzzle_id - b.puzzle_id)[0];
}

export function collectionStartHref(items: ListedCollectionItem[]): string | null {
  const first = firstCollectionItem(items);
  return first ? puzzleHref(first.game, first.slug) : null;
}

export function filterHubCollections(
  collections: ListedCollectionsType,
  byKey: Map<string, HubPuzzle>,
  filter: HubPuzzleFilter
): ListedCollectionsType {
  const game = filter.game ?? 'all';
  const tags = filter.tags ?? [];
  const query = filter.query ?? '';
  return collections.filter((collection) => {
    const items = resolveCollectionItems(collection.items, byKey);
    if (game !== 'all' && !items.some((item) => item.game === game)) return false;
    if (
      tags.length > 0 &&
      !items.some((item) => item.tags.some((tag) => tags.includes(tag.slug)))
    ) {
      return false;
    }
    const fields = [
      collection.title,
      collection.description,
      ...items.flatMap((item) =>
        item.game === 'padavali'
          ? [
              item.source.title,
              item.source.title_normal,
              item.source.description,
              item.source.description_original
            ]
          : [item.title, item.description]
      )
    ];
    return matchesWordSearch(fields, query);
  });
}
