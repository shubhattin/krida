'use client';

import { useMemo, useState } from 'react';
import { Image } from '@unpic/react';
import { Layers as LayersIcon, Puzzle as PuzzleIcon, SearchIcon } from 'lucide-react';
import { CrosswordPreviewCard } from '~/components/pages/cross_word/CrosswordPreviewCard';
import type { CrosswordListedPuzzle } from '~/components/pages/cross_word/CrosswordPreviewCard';
import { PuzzlePreviewCard } from '~/components/pages/padavali/PuzzlePreviewCard';
import type { DisplayPuzzle } from '~/components/pages/padavali/listed_puzzle_display';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import type {
  ListedCollectionItem,
  ListedCollectionsType
} from '~/util/cache.server/collection_cache';
import type { GameKind, PublicTag } from '~/util/catalog/tags';

export function TagFilterPopover({
  tags,
  selected,
  onChange
}: {
  tags: PublicTag[];
  selected: string[];
  onChange: (slugs: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.slug.includes(query));
  }, [search, tags]);

  const toggle = (slug: string) => {
    onChange(
      selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug]
    );
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
        Tags{selected.length > 0 ? ` (${selected.length})` : ''}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="relative">
          <SearchIcon className="absolute top-2 left-2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search tags"
            className="h-8 pl-7 text-sm"
          />
        </div>
        <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
          {visible.map((tag) => {
            const active = selected.includes(tag.slug);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(tag.slug)}
                className={cn(
                  'block w-full rounded px-2 py-1 text-left text-sm',
                  active ? 'bg-primary/15 text-foreground' : 'hover:bg-muted'
                )}
              >
                {tag.slug}
              </button>
            );
          })}
          {visible.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">No matching tags</p>
          ) : null}
        </div>
        {selected.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function matchesSelectedTags(tags: { slug: string }[] | undefined, selected: string[]) {
  if (selected.length === 0) return true;
  const slugs = new Set(tags?.map((tag) => tag.slug) ?? []);
  return selected.some((slug) => slugs.has(slug));
}

export function uniqueTags(groups: { tags?: PublicTag[] }[]): PublicTag[] {
  const bySlug = new Map<string, PublicTag>();
  for (const group of groups) {
    for (const tag of group.tags ?? []) bySlug.set(tag.slug, tag);
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

type FilteredCollection = {
  uid: string;
  slug: string;
  title: string;
  description: string;
  image: ListedCollectionsType[number]['image'];
  items: ListedCollectionItem[];
};

function filterCollectionsForGame(
  collections: ListedCollectionsType,
  game: GameKind
): FilteredCollection[] {
  return collections.flatMap((collection) => {
    const items = collection.items
      .filter((item) => item.game === game)
      .toSorted((a, b) => a.order_index - b.order_index || a.puzzle_id - b.puzzle_id);
    if (items.length === 0) return [];
    return [
      {
        uid: collection.uid,
        slug: collection.slug,
        title: collection.title,
        description: collection.description,
        image: collection.image,
        items
      }
    ];
  });
}

type PublicCollectionsProps =
  | {
      game: 'padavali';
      collections: ListedCollectionsType;
      puzzles: DisplayPuzzle[];
    }
  | {
      game: 'crossword';
      collections: ListedCollectionsType;
      puzzles: CrosswordListedPuzzle[];
    };

export function PublicCollections(props: PublicCollectionsProps) {
  if (props.game === 'padavali') {
    return (
      <PublicCollectionsView
        game="padavali"
        collections={props.collections}
        puzzles={props.puzzles}
      />
    );
  }
  return (
    <PublicCollectionsView
      game="crossword"
      collections={props.collections}
      puzzles={props.puzzles}
    />
  );
}

function PublicCollectionsView(props: PublicCollectionsProps) {
  const { collections, game } = props;
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const filtered = useMemo(() => filterCollectionsForGame(collections, game), [collections, game]);
  const selected = filtered.find((collection) => collection.uid === selectedUid) ?? null;

  if (filtered.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No collections yet.</p>;
  }

  if (!selected) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((collection) => (
          <button
            key={collection.uid}
            type="button"
            onClick={() => setSelectedUid(collection.uid)}
            className="overflow-hidden rounded-xl border border-border/70 bg-card text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="aspect-3/2 bg-muted">
              {collection.image ? (
                <Image
                  src={getCDNUrl(collection.image.s3_key)}
                  alt=""
                  width={collection.image.width}
                  height={collection.image.height}
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-1 p-3">
              <p className="font-semibold">{collection.title}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>
              <p className="text-xs text-muted-foreground">
                {collection.items.length} puzzle{collection.items.length === 1 ? '' : 's'}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedUid(null)}>
        All collections
      </Button>
      <div>
        <h2 className="text-xl font-semibold">{selected.title}</h2>
        {selected.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
        ) : null}
      </div>
      {selected.items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No puzzles in this collection.</p>
      ) : game === 'padavali' ? (
        <PadavaliCollectionItems items={selected.items} puzzles={props.puzzles} />
      ) : (
        <CrosswordCollectionItems items={selected.items} puzzles={props.puzzles} />
      )}
    </div>
  );
}

function PadavaliCollectionItems({
  items,
  puzzles
}: {
  items: ListedCollectionItem[];
  puzzles: DisplayPuzzle[];
}) {
  const puzzlesById = useMemo(
    () => new Map(puzzles.map((puzzle) => [puzzle.id, puzzle])),
    [puzzles]
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const puzzle =
          puzzlesById.get(item.puzzle_id) ??
          ({
            id: item.puzzle_id,
            slug: item.slug,
            title: item.title,
            description: item.description,
            description_original: item.description,
            title_normal: item.title,
            image: item.image,
            tags: []
          } satisfies DisplayPuzzle);
        return <PuzzlePreviewCard key={`padavali-${item.puzzle_id}`} puzzle={puzzle} />;
      })}
    </div>
  );
}

function CrosswordCollectionItems({
  items,
  puzzles
}: {
  items: ListedCollectionItem[];
  puzzles: CrosswordListedPuzzle[];
}) {
  const puzzlesById = useMemo(
    () => new Map(puzzles.map((puzzle) => [puzzle.id, puzzle])),
    [puzzles]
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const puzzle =
          puzzlesById.get(item.puzzle_id) ??
          ({
            id: item.puzzle_id,
            slug: item.slug,
            title: item.title,
            description: item.description,
            image: item.image,
            tags: []
          } satisfies CrosswordListedPuzzle);
        return <CrosswordPreviewCard key={`crossword-${item.puzzle_id}`} puzzle={puzzle} />;
      })}
    </div>
  );
}

export function BrowseModeSwitch({
  mode,
  onChange,
  puzzleCount,
  collectionCount,
  className,
  fullWidth = false
}: {
  mode: 'puzzles' | 'collections';
  onChange: (mode: 'puzzles' | 'collections') => void;
  puzzleCount?: number;
  collectionCount?: number;
  className?: string;
  fullWidth?: boolean;
}) {
  const options = [
    {
      value: 'puzzles' as const,
      label: 'Puzzles',
      icon: PuzzleIcon,
      count: puzzleCount
    },
    {
      value: 'collections' as const,
      label: 'Collections',
      icon: LayersIcon,
      count: collectionCount
    }
  ];
  return (
    <div
      role="tablist"
      aria-label="Browse puzzles or collections"
      className={cn(
        'inline-flex shrink-0 items-center rounded-lg border border-border/70 bg-muted/40 p-0.5',
        fullWidth && 'flex w-full',
        className
      )}
    >
      {options.map((option) => {
        const active = mode === option.value;
        const IconCmp = option.icon;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            role="tab"
            variant={active ? 'secondary' : 'ghost'}
            aria-selected={active}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5',
              fullWidth && 'flex-1',
              active && 'shadow-xs'
            )}
          >
            <IconCmp className="size-3.5" aria-hidden />
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                  active ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {option.count}
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
