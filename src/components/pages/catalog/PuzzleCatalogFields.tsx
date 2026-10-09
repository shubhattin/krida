'use client';

import { useState } from 'react';
import { atom, useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { XIcon } from 'lucide-react';
import { useTRPC } from '~/api/client';
import { useEditorHistoryActions } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import { normalizeTagSlug } from '~/util/catalog/tags';

export type EditorTag = { id: number; slug: string };
export type EditorCollectionLink = { id: number; uid: string; slug: string; title: string };

export const puzzle_tags_atom = atom<EditorTag[]>([]);
export const puzzle_collections_atom = atom<EditorCollectionLink[]>([]);

export function PuzzleCatalogFields() {
  return (
    <div className="space-y-5">
      <TagsField />
      <CollectionsField />
    </div>
  );
}

function TagsField() {
  const trpc = useTRPC();
  const { commit } = useEditorHistoryActions();
  const [tags, setTags] = useAtom(puzzle_tags_atom);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const normalized = normalizeTagSlug(draft);
  const suggest_q = useQuery(
    trpc.catalog.list_tags.queryOptions(
      { page: 1, size: 12, search: draft.trim() || undefined },
      { enabled: open }
    )
  );

  const selected = new Set(tags.map((tag) => tag.slug));
  const matches = (suggest_q.data?.list ?? []).filter((tag) => !selected.has(tag.slug));
  const exactExists = selected.has(normalized) || matches.some((tag) => tag.slug === normalized);
  const options = matches.map((tag) => ({
    key: tag.slug,
    slug: tag.slug,
    label: tag.slug,
    create: false
  }));
  if (normalized && !exactExists && !suggest_q.isFetching) {
    options.push({
      key: `create:${normalized}`,
      slug: normalized,
      label: `Create “${normalized}”`,
      create: true
    });
  }
  const activeIndex = options.length === 0 ? 0 : Math.min(active, options.length - 1);

  const addSlug = (slug: string) => {
    if (!slug || tags.some((tag) => tag.slug === slug)) return;
    const known = matches.find((tag) => tag.slug === slug);
    setTags((current) => [...current, known ?? { id: 0, slug }]);
    setDraft('');
    setActive(0);
    setOpen(true);
    commit();
  };

  const removeSlug = (slug: string) => {
    setTags((current) => current.filter((tag) => tag.slug !== slug));
    commit();
  };

  return (
    <div className="space-y-1.5">
      <div className="text-lg font-bold">Tags</div>
      <p className="text-xs text-muted-foreground">Applied when you save the puzzle.</p>
      <div className="relative max-w-xl">
        <div
          className={cn(
            'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5',
            'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40'
          )}
        >
          {tags.map((tag) => (
            <span
              key={tag.slug}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm"
            >
              {tag.slug}
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Remove tag ${tag.slug}`}
                onClick={() => removeSlug(tag.slug)}
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls="puzzle-tag-options"
            aria-autocomplete="list"
            placeholder={tags.length === 0 ? 'Search or create a tag' : 'Add another'}
            className="min-w-36 flex-1 bg-transparent py-1 text-sm outline-none"
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!open) {
                  setOpen(true);
                  setActive(0);
                } else if (options.length > 0) {
                  setActive((index) => Math.min(options.length - 1, index + 1));
                }
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === 'Escape') {
                setOpen(false);
              } else if (event.key === 'Enter' && open && options[activeIndex]) {
                event.preventDefault();
                addSlug(options[activeIndex].slug);
              } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
                removeSlug(tags[tags.length - 1]!.slug);
              }
            }}
          />
        </div>
        {open && (options.length > 0 || suggest_q.isFetching) ? (
          <ul
            id="puzzle-tag-options"
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {suggest_q.isFetching && options.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</li>
            ) : null}
            {options.map((option, index) => (
              <li key={option.key} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    'block w-full rounded-md px-2 py-1.5 text-left text-sm',
                    index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  )}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addSlug(option.slug);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function CollectionsField() {
  const trpc = useTRPC();
  const { commit } = useEditorHistoryActions();
  const [links, setLinks] = useAtom(puzzle_collections_atom);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const all_q = useQuery(trpc.catalog.list_collections.queryOptions());

  const selected = new Set(links.map((link) => link.uid));
  const query = draft.trim().toLowerCase();
  const options = (all_q.data ?? []).filter((collection) => {
    if (selected.has(collection.uid)) return false;
    if (!query) return true;
    return (
      collection.title.toLowerCase().includes(query) ||
      collection.slug.toLowerCase().includes(query)
    );
  });
  const activeIndex = options.length === 0 ? 0 : Math.min(active, options.length - 1);

  const addCollection = (uid: string) => {
    const collection = (all_q.data ?? []).find((row) => row.uid === uid);
    if (!collection || selected.has(uid)) return;
    setLinks((current) => [
      ...current,
      {
        id: collection.id,
        uid: collection.uid,
        slug: collection.slug,
        title: collection.title
      }
    ]);
    setDraft('');
    setActive(0);
    setOpen(true);
    commit();
  };

  const removeCollection = (uid: string) => {
    setLinks((current) => current.filter((link) => link.uid !== uid));
    commit();
  };

  return (
    <div className="space-y-1.5">
      <div className="text-lg font-bold">Collections</div>
      <p className="text-xs text-muted-foreground">
        Membership is saved with the puzzle. New ones are appended to each collection.
      </p>
      <div className="relative max-w-xl">
        <div
          className={cn(
            'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5',
            'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40'
          )}
        >
          {links.map((link) => (
            <span
              key={link.uid}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-sm"
            >
              <span className="truncate">{link.title}</span>
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground"
                aria-label={`Remove from ${link.title}`}
                onClick={() => removeCollection(link.uid)}
              >
                <XIcon className="size-3.5" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls="puzzle-collection-options"
            aria-autocomplete="list"
            placeholder={links.length === 0 ? 'Search collections' : 'Add another'}
            className="min-w-36 flex-1 bg-transparent py-1 text-sm outline-none"
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (!open) {
                  setOpen(true);
                  setActive(0);
                } else if (options.length > 0) {
                  setActive((index) => Math.min(options.length - 1, index + 1));
                }
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === 'Escape') {
                setOpen(false);
              } else if (event.key === 'Enter' && open && options[activeIndex]) {
                event.preventDefault();
                addCollection(options[activeIndex].uid);
              } else if (event.key === 'Backspace' && draft === '' && links.length > 0) {
                removeCollection(links[links.length - 1]!.uid);
              }
            }}
          />
        </div>
        {open && options.length > 0 ? (
          <ul
            id="puzzle-collection-options"
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
          >
            {options.map((collection, index) => (
              <li key={collection.uid} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    'block w-full rounded-md px-2 py-1.5 text-left text-sm',
                    index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  )}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addCollection(collection.uid);
                  }}
                >
                  <span className="block truncate">{collection.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {collection.slug}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
