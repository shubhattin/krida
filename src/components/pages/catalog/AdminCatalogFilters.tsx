'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Layers, Search, Tag, XIcon } from 'lucide-react';
import { useTRPC } from '~/api/client';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';

type Props = {
  tagSlugs: string[];
  collectionIds: number[];
  onTagSlugsChange: (value: string[]) => void;
  onCollectionIdsChange: (value: number[]) => void;
};

/**
 * Tag and collection filters for the admin puzzle lists. Each facet is a searchable
 * multi-select: a puzzle matches any picked tag and any picked collection.
 */
export function AdminCatalogFilters({
  tagSlugs,
  collectionIds,
  onTagSlugsChange,
  onCollectionIdsChange
}: Props) {
  const trpc = useTRPC();
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [collectionSearch, setCollectionSearch] = useState('');

  const tags_q = useQuery(
    trpc.catalog.list_tags.queryOptions(
      {
        page: 1,
        size: 50,
        search: tagSearch.trim() || undefined,
        sort: 'count',
        order: 'desc',
        // Unused tags can't match anything.
        usage: 'used'
      },
      { enabled: tagsOpen, placeholderData: keepPreviousData }
    )
  );
  const collections_q = useQuery(trpc.catalog.list_collections.queryOptions());

  const tagOptions = (tags_q.data?.list ?? []).map((tag) => ({
    value: tag.slug,
    label: tag.slug
  }));
  const collectionTitle = new Map(
    (collections_q.data ?? []).map((collection) => [collection.id, collection.title])
  );
  const collectionQuery = collectionSearch.trim().toLowerCase();
  const collectionOptions = (collections_q.data ?? [])
    .filter(
      (collection) =>
        !collectionQuery ||
        collection.title.toLowerCase().includes(collectionQuery) ||
        collection.slug.toLowerCase().includes(collectionQuery)
    )
    .map((collection) => ({
      value: collection.id,
      label: collection.title,
      hint: collection.slug
    }));

  const hasFilters = tagSlugs.length > 0 || collectionIds.length > 0;

  return (
    <>
      <FacetFilter
        icon={<Tag className="size-3.5 sm:size-4" />}
        label="Tags"
        searchPlaceholder="Search tags"
        emptyText={tags_q.isFetching ? 'Searching…' : 'No matching tags'}
        search={tagSearch}
        onSearchChange={setTagSearch}
        options={tagOptions}
        selected={tagSlugs}
        selectedLabel={(slug) => slug}
        onChange={onTagSlugsChange}
        onOpenChange={setTagsOpen}
      />
      <FacetFilter
        icon={<Layers className="size-3.5 sm:size-4" />}
        label="Collections"
        searchPlaceholder="Search collections"
        emptyText={collections_q.isPending ? 'Loading…' : 'No matching collections'}
        search={collectionSearch}
        onSearchChange={setCollectionSearch}
        options={collectionOptions}
        selected={collectionIds}
        selectedLabel={(id) => collectionTitle.get(id) ?? `#${id}`}
        onChange={onCollectionIdsChange}
      />
      {hasFilters ? (
        <div className="flex basis-full flex-wrap items-center justify-center gap-1.5">
          {tagSlugs.map((slug) => (
            <FilterChip
              key={`tag:${slug}`}
              icon={<Tag className="size-3" />}
              label={slug}
              onRemove={() => onTagSlugsChange(tagSlugs.filter((value) => value !== slug))}
            />
          ))}
          {collectionIds.map((id) => (
            <FilterChip
              key={`collection:${id}`}
              icon={<Layers className="size-3" />}
              label={collectionTitle.get(id) ?? `#${id}`}
              onRemove={() => onCollectionIdsChange(collectionIds.filter((value) => value !== id))}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => {
              onTagSlugsChange([]);
              onCollectionIdsChange([]);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : null}
    </>
  );
}

function FilterChip({
  icon,
  label,
  onRemove
}: {
  icon: ReactNode;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-56 items-center gap-1 rounded-full border border-slate-200 bg-slate-100 py-0.5 pr-1 pl-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
      <button
        type="button"
        className="rounded-full p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-700"
        aria-label={`Remove filter ${label}`}
        onClick={onRemove}
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

type FacetOption<T> = { value: T; label: string; hint?: string };

function FacetFilter<T extends string | number>({
  icon,
  label,
  searchPlaceholder,
  emptyText,
  search,
  onSearchChange,
  options,
  selected,
  selectedLabel,
  onChange,
  onOpenChange
}: {
  icon: ReactNode;
  label: string;
  searchPlaceholder: string;
  emptyText: string;
  search: string;
  onSearchChange: (value: string) => void;
  options: FacetOption<T>[];
  selected: T[];
  /** Label for a picked value that the current search no longer returns. */
  selectedLabel: (value: T) => string;
  onChange: (value: T[]) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected);
  // Picked values stay on top (even when the search hides them), the rest follow.
  const rows: FacetOption<T>[] = [
    ...selected.map(
      (value) =>
        options.find((option) => option.value === value) ?? { value, label: selectedLabel(value) }
    ),
    ...options.filter((option) => !selectedSet.has(option.value))
  ];

  const toggle = (value: T) =>
    onChange(selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const moveFocus = (event: KeyboardEvent<HTMLElement>, step: 1 | -1) => {
    const items = [
      ...(event.currentTarget
        .closest('[data-facet-panel]')
        ?.querySelectorAll<HTMLElement>('[role=option]') ?? [])
    ];
    if (items.length === 0) return;
    event.preventDefault();
    const index = items.findIndex((item) => item === document.activeElement);
    items[Math.min(items.length - 1, Math.max(0, index + step))]?.focus();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
        if (!next) onSearchChange('');
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Filter by ${label.toLowerCase()}`}
            className={cn(
              'gap-1.5 text-xs sm:text-sm',
              selected.length > 0 &&
                'border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-950/60 dark:text-indigo-100 dark:hover:bg-indigo-900/60'
            )}
          />
        }
      >
        {icon}
        {label}
        {selected.length > 0 ? (
          <span className="rounded-full bg-indigo-600 px-1.5 text-[11px] leading-4 font-semibold text-white">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown
          className={cn('size-3.5 opacity-60 transition-transform', open && 'rotate-180')}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-0" data-facet-panel>
        <div className="flex items-center gap-2 border-b border-border px-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={search}
            placeholder={searchPlaceholder}
            aria-controls={listboxId}
            className="h-9 w-full bg-transparent text-sm outline-none"
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') moveFocus(event, 1);
              // Enter picks the first match that isn't already picked.
              if (event.key === 'Enter') {
                const first = rows.find((row) => !selectedSet.has(row.value));
                if (first) {
                  event.preventDefault();
                  toggle(first.value);
                }
              }
            }}
          />
        </div>
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable
          aria-label={label}
          className="max-h-64 overflow-y-auto p-1"
        >
          {rows.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            rows.map((row) => {
              const isSelected = selectedSet.has(row.value);
              return (
                <button
                  key={String(row.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-accent focus-visible:text-accent-foreground"
                  onClick={() => toggle(row.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') moveFocus(event, 1);
                    if (event.key === 'ArrowUp') moveFocus(event, -1);
                  }}
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-input bg-background'
                    )}
                  >
                    {isSelected ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.label}</span>
                    {row.hint ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {row.hint}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-1.5 text-xs text-muted-foreground">
          <span>
            {selected.length > 0 ? `${selected.length} selected · matches any` : 'Pick one or more'}
          </span>
          {selected.length > 0 ? (
            <Button type="button" variant="ghost" size="xs" onClick={() => onChange([])}>
              Clear
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
