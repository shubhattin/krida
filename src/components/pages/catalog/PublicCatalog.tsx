'use client';

import { useMemo, useState } from 'react';
import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { SearchIcon } from 'lucide-react';
import { GameKindIcon, gameKindLabel } from '~/components/pages/catalog/GameKindIcon';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import type { PublicTag } from '~/util/catalog/tags';

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
    return tags.filter((tag) => tag.slug.includes(query) || tag.name.toLowerCase().includes(query));
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

export function PublicCollections({
  collections,
  titlesByPuzzleId
}: {
  collections: ListedCollectionsType;
  titlesByPuzzleId?: Map<number, { title: string; description: string }>;
}) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const selected = collections.find((collection) => collection.uid === selectedUid) ?? null;

  if (collections.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No collections yet.</p>;
  }

  if (!selected) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <button
            key={collection.uid}
            type="button"
            onClick={() => setSelectedUid(collection.uid)}
            className="overflow-hidden rounded-xl border border-border/70 bg-card text-left"
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
              <p className="text-xs text-muted-foreground">{collection.items.length} games</p>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {selected.items.map((item) => {
          const display =
            item.game === 'padavali' ? titlesByPuzzleId?.get(item.puzzle_id) : undefined;
          const title = display?.title ?? item.title;
          const description = display?.description ?? item.description;
          const to = item.game === 'padavali' ? '/padavali/$slug' : '/padajala/$slug';
          return (
            <Link
              key={`${item.game}-${item.puzzle_id}`}
              to={to}
              params={{ slug: item.slug }}
              className="flex gap-3 rounded-xl border border-border/70 p-3 no-underline"
            >
              <GameKindIcon game={item.game} />
              {item.image ? (
                <Image
                  src={getCDNUrl(item.image.s3_key)}
                  alt=""
                  width={item.image.width}
                  height={item.image.height}
                  className="h-12 w-[4.5rem] shrink-0 rounded object-cover"
                />
              ) : null}
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{title}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {gameKindLabel(item.game)}
                  {description ? ` · ${description}` : ''}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function BrowseModeSwitch({
  mode,
  onChange
}: {
  mode: 'puzzles' | 'collections';
  onChange: (mode: 'puzzles' | 'collections') => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border/70 p-0.5">
      {(['puzzles', 'collections'] as const).map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={mode === value ? 'secondary' : 'ghost'}
          onClick={() => onChange(value)}
        >
          {value === 'puzzles' ? 'Puzzles' : 'Collections'}
        </Button>
      ))}
    </div>
  );
}
