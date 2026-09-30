'use client';

import { useMemo, type ReactNode } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { HubData } from './hub_data';
import { filterHubPuzzles, tagsByPopularity, type HubPuzzle } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { HubCollectionsRow } from './HubCollectionsRow';
import { HubLibraryFilters, HubActiveFilters } from './HubLibraryFilters';
import { HubLibraryResults } from './HubLibraryResults';
import { HubLibrarySearch } from './HubLibrarySearch';
import { HubTodayStrip } from './HubTodayStrip';
import {
  compactLibrarySearch,
  LIBRARY_PAGE_SIZE,
  libraryHasFilters,
  librarySearchSchema,
  libraryTagList,
  serializeLibraryTags,
  sortLibraryPuzzles,
  type LibraryGameFilter,
  type LibrarySearch,
  type LibrarySort
} from './library_search';

function applyLibraryPatch(current: LibrarySearch, patch: Partial<LibrarySearch>): LibrarySearch {
  const next = { ...current, ...patch };
  const filterChanged =
    patch.q !== undefined ||
    patch.game !== undefined ||
    patch.tags !== undefined ||
    patch.tag !== undefined ||
    patch.sort !== undefined;
  if (filterChanged && patch.page === undefined) next.page = 1;
  return next;
}

export default function HubLibrary({
  data,
  puzzles: scopedPuzzles,
  heading,
  subheading,
  showToday = true,
  showCollections = true,
  preserveOrder = false
}: {
  data: HubData;
  puzzles?: HubPuzzle[];
  heading?: ReactNode;
  subheading?: string;
  showToday?: boolean;
  showCollections?: boolean;
  preserveOrder?: boolean;
}) {
  const rawSearch = useSearch({ strict: false });
  const search = librarySearchSchema.parse(rawSearch);
  const navigate = useNavigate();
  const { puzzles: allPuzzles } = useHubPuzzles(data);
  const source = scopedPuzzles ?? allPuzzles;
  const selectedTags = libraryTagList(search);

  const setSearch = (patch: Partial<LibrarySearch>) => {
    const next = applyLibraryPatch(search, patch);
    void navigate({
      replace: true,
      // SAFETY: HubLibrary only mounts on hub routes that share librarySearchSchema.
      search: () => compactLibrarySearch(next) as never
    });
  };

  const forTagCounts = useMemo(
    () =>
      filterHubPuzzles(source, {
        game: search.game,
        query: search.q
      }),
    [source, search.game, search.q]
  );
  const tags = useMemo(() => tagsByPopularity(forTagCounts), [forTagCounts]);

  const forGameCounts = useMemo(
    () =>
      filterHubPuzzles(source, {
        tags: selectedTags,
        query: search.q
      }),
    [source, selectedTags, search.q]
  );

  const gameCounts = {
    all: forGameCounts.length,
    padavali: forGameCounts.filter((puzzle) => puzzle.game === 'padavali').length,
    crossword: forGameCounts.filter((puzzle) => puzzle.game === 'crossword').length
  };

  const filtered = useMemo(() => {
    const matched = filterHubPuzzles(source, {
      game: search.game,
      tags: selectedTags,
      query: search.q
    });
    return sortLibraryPuzzles(matched, search.sort, preserveOrder);
  }, [source, search.game, search.sort, search.q, selectedTags, preserveOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / LIBRARY_PAGE_SIZE));
  const page = Math.min(search.page, pageCount);
  const pageItems = filtered.slice((page - 1) * LIBRARY_PAGE_SIZE, page * LIBRARY_PAGE_SIZE);

  const toggleTag = (slug: string) => {
    const next = selectedTags.includes(slug)
      ? selectedTags.filter((tag) => tag !== slug)
      : [...selectedTags, slug];
    setSearch({ tags: serializeLibraryTags(next), tag: undefined });
  };

  const clearFilters = () =>
    setSearch({ game: 'all', q: undefined, tags: undefined, tag: undefined, page: 1 });

  return (
    <div className="relative min-h-dvh">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-linear-to-b from-primary/8 to-transparent"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            {heading ?? (
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                The Sanskrit puzzle library
              </h1>
            )}
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {subheading ??
                'Search or filter across every game, then play. More games will land here over time.'}
            </p>
          </div>
          <HubLibrarySearch
            search={search}
            onQueryChange={(query) => setSearch({ q: query || undefined })}
          />
          <HubLibraryFilters
            search={search}
            gameCounts={gameCounts}
            tags={tags}
            onGameChange={(game: LibraryGameFilter) => setSearch({ game })}
            onSortChange={(sort: LibrarySort) => setSearch({ sort })}
            onToggleTag={toggleTag}
          />
        </div>

        {showToday ? <HubTodayStrip data={data} /> : null}
        {showCollections ? <HubCollectionsRow collections={data.collections} /> : null}

        <section className="flex flex-col gap-4">
          <HubActiveFilters search={search} resultCount={filtered.length} onClear={clearFilters} />
          <HubLibraryResults
            puzzles={pageItems}
            page={page}
            pageCount={pageCount}
            onPageChange={(nextPage) => setSearch({ page: nextPage })}
            onClearFilters={clearFilters}
            hasFilters={libraryHasFilters(search)}
          />
        </section>
      </div>
    </div>
  );
}
