'use client';

import { X } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { cn } from '~/lib/utils';
import { HUB_GAMES } from './hub_games';
import type { LibraryGameFilter, LibrarySearch, LibrarySort } from './library_search';
import { libraryTagList } from './library_search';

const SORT_ITEMS = [
  { label: 'Newest', value: 'newest' },
  { label: 'A–Z', value: 'az' }
] as const;

const GAME_OPTIONS: { value: LibraryGameFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'padavali', label: HUB_GAMES.padavali.name },
  { value: 'crossword', label: HUB_GAMES.crossword.name }
];

export function HubLibraryFilters({
  search,
  gameCounts,
  tags,
  onGameChange,
  onSortChange,
  onToggleTag
}: {
  search: LibrarySearch;
  gameCounts: Record<LibraryGameFilter, number>;
  tags: { id: number; slug: string; name: string; count: number }[];
  onGameChange: (game: LibraryGameFilter) => void;
  onSortChange: (sort: LibrarySort) => void;
  onToggleTag: (slug: string) => void;
}) {
  const selectedTags = libraryTagList(search);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[search.game]}
          onValueChange={(next) => {
            const value = next[0];
            if (value === 'all' || value === 'padavali' || value === 'crossword') {
              onGameChange(value);
            }
          }}
          variant="outline"
          size="sm"
          className="w-full border border-border sm:w-fit"
        >
          {GAME_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="flex-1 px-2.5 sm:flex-none"
            >
              {option.label}
              <span className="text-[11px] text-muted-foreground">{gameCounts[option.value]}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Select
          items={[...SORT_ITEMS]}
          value={search.sort}
          onValueChange={(value) => {
            if (value === 'newest' || value === 'az') onSortChange(value);
          }}
        >
          <SelectTrigger size="sm" className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectGroup>
              {SORT_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {tags.length > 0 ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {tags.map((tag) => {
            const active = selectedTags.includes(tag.slug);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleTag(tag.slug)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                )}
              >
                {tag.name}
                <span className={cn(active ? 'opacity-80' : 'text-muted-foreground')}>
                  {tag.count}
                </span>
                {active ? <X className="size-3" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function HubActiveFilters({
  search,
  resultCount,
  onClear
}: {
  search: LibrarySearch;
  resultCount: number;
  onClear: () => void;
}) {
  const selectedTags = libraryTagList(search);
  const showClear = search.game !== 'all' || Boolean(search.q) || selectedTags.length > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{resultCount}</span>
        {` puzzle${resultCount === 1 ? '' : 's'}`}
      </p>
      {showClear ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          {search.sort === 'az' ? 'A–Z' : 'Newest'}
        </Badge>
      )}
    </div>
  );
}
