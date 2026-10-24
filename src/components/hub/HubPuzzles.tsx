'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import {
  ChevronDownIcon,
  Layers as LayersIcon,
  Puzzle as PuzzleIcon,
  SearchIcon,
  SearchXIcon,
  TagIcon,
  XIcon
} from 'lucide-react';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Switch } from '~/components/ui/switch';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { scrollPaginationListToStart } from '~/lib/pagination-scroll';
import { cn } from '~/lib/utils';

import { GamePickerChips, type GamePick } from './GamePickerChips';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { HubCollectionCard } from './HubCollectionCard';
import {
  filterHubCollections,
  filterHubPuzzles,
  tagsByPopularity,
  type HubPuzzle
} from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { GAME_KINDS, type GameKind, type PublicTag } from '~/util/catalog/tags';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import type { PuzzlesSearch } from '~/routes/_hub/puzzles';

const puzzlesRoute = getRouteApi('/_hub/puzzles');
const PAGE_LIMIT = 12;

const VIEW_TABS = [
  { value: 'puzzles', label: 'Puzzles', icon: PuzzleIcon },
  { value: 'collections', label: 'Collections', icon: LayersIcon }
] as const;

type GameCounts = Partial<Record<GamePick, number>>;
type CountedTag = PublicTag & { count: number };

/** Any filter change resets pagination back to page 1. */
function useUpdateFilters() {
  const navigate = puzzlesRoute.useNavigate();
  return (patch: Partial<PuzzlesSearch>, replace = false) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), replace });
}

function pageCountFor(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_LIMIT));
}

/** Page 1 stays out of the URL; higher pages use `?page=N`. */
function pageSearchValue(page: number): number | undefined {
  return page <= 1 ? undefined : page;
}

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
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

const PILL_CLASS =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none';
const PILL_IDLE =
  'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-600';

function ViewTabs({
  view,
  counts
}: {
  view: PuzzlesSearch['view'];
  counts: Record<PuzzlesSearch['view'], number>;
}) {
  const updateFilters = useUpdateFilters();
  return (
    <div
      role="tablist"
      aria-label="Browse puzzles or collections"
      className="grid grid-cols-2 rounded-full border border-border/70 bg-muted/60 p-1 sm:inline-grid"
    >
      {VIEW_TABS.map(({ value, label, icon: TabIcon }) => {
        const active = view === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => updateFilters({ view: value })}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TabIcon className="size-3.5" aria-hidden />
            {label}
            <span className="text-xs text-muted-foreground tabular-nums">{counts[value]}</span>
          </button>
        );
      })}
    </div>
  );
}

function SearchField() {
  const search = puzzlesRoute.useSearch();
  const updateFilters = useUpdateFilters();
  const { script } = useContext(AppContext);
  const [lipiLekhikaTyping, setLipiLekhikaTyping] = useState(false);
  const typingCtx = useMemo(() => createTypingContext(script!), [script]);

  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  const setQuery = (value: string) => updateFilters({ q: value || undefined }, true);

  return (
    <InputGroup className="h-10 rounded-xl bg-background shadow-xs">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        value={search.q ?? ''}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onBeforeInput={(event) =>
          handleTypingBeforeInputEvent(typingCtx, event, setQuery, lipiLekhikaTyping)
        }
        onBlur={() => typingCtx.clearContext()}
        onKeyDown={(event) => {
          if (event.altKey && ['x', 'c'].includes(event.key.toLowerCase())) {
            event.preventDefault();
            setLipiLekhikaTyping((prev) => !prev);
            return;
          }
          clearTypingContextOnKeyDown(event, typingCtx);
        }}
        placeholder="Search puzzles"
        aria-label="Search puzzles and collections"
      />
      <InputGroupAddon align="inline-end">
        <Label
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted"
          title="Lipi Lekhika typing (Alt+X)"
        >
          <Icon src={LanguageIcon} className="size-5" />
          <Switch
            size="sm"
            checked={lipiLekhikaTyping}
            onCheckedChange={setLipiLekhikaTyping}
            aria-label="Enable Lipi Lekhika typing in search"
          />
        </Label>
      </InputGroupAddon>
    </InputGroup>
  );
}

function GameFilters({
  games,
  gameCounts
}: {
  games: readonly GameKind[];
  gameCounts: GameCounts;
}) {
  const search = puzzlesRoute.useSearch();
  const updateFilters = useUpdateFilters();

  return (
    <GamePickerChips
      games={games}
      value={search.game}
      onChange={(game) => updateFilters({ game })}
      counts={gameCounts}
      compactUntil="lg"
    />
  );
}

function TopicsFilter({ tags }: { tags: CountedTag[] }) {
  const search = puzzlesRoute.useSearch();
  const updateFilters = useUpdateFilters();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = search.tag;
  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return tags;
    return tags.filter((tag) => tag.slug.includes(trimmed));
  }, [query, tags]);

  // Always rendered so the filter row keeps one shape; a game with no topics just disables it.
  const empty = tags.length === 0;

  const setTag = (slug: string | undefined) => {
    updateFilters({ tag: slug });
    setOpen(false);
  };

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={empty}
          render={
            <button
              type="button"
              title={empty ? 'No topics for this game' : 'Filter by topic'}
              aria-label={selected ? `Topic: ${selected}` : 'Topics'}
              className={cn(
                PILL_CLASS,
                // Phones: icon only (it shares the search row); the tint shows a topic is set.
                'max-w-48 disabled:pointer-events-none disabled:opacity-40 max-sm:w-8 max-sm:justify-center max-sm:px-0',
                selected
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-200'
                  : PILL_IDLE
              )}
            />
          }
        >
          <TagIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate max-sm:hidden">{selected ?? 'Topics'}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-60 max-sm:hidden" aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search topics"
              className="h-8 pl-7 text-sm"
              aria-label="Search topics"
            />
          </div>
          <div className="mt-2 flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {selected ? (
              <button
                type="button"
                onClick={() => setTag(undefined)}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-3.5" aria-hidden />
                Clear topic
              </button>
            ) : null}
            {visible.map((tag) => {
              const active = selected === tag.slug;
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTag(active ? undefined : tag.slug)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                    active ? 'bg-primary/15 text-foreground' : 'hover:bg-muted'
                  )}
                >
                  <span className="min-w-0 truncate">{tag.slug}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                    {tag.count}
                  </span>
                </button>
              );
            })}
            {visible.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">No matching topics</p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      {selected ? (
        <button
          type="button"
          onClick={() => setTag(undefined)}
          aria-label={`Clear topic ${selected}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground max-sm:hidden"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ kind }: { kind: 'puzzles' | 'collections' }) {
  const updateFilters = useUpdateFilters();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-16 text-center">
      <SearchXIcon className="size-8 text-muted-foreground/60" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">No {kind} found</p>
        <p className="text-sm text-muted-foreground">
          Try a different search, or clear the filters to see everything.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateFilters({ game: 'all', tag: undefined, q: undefined })}
      >
        Clear filters
      </Button>
    </div>
  );
}

/** Puzzle results; a text search also surfaces matching collections at the top of page 1. */
function PuzzlesGrid({
  puzzles,
  collections
}: {
  puzzles: HubPuzzle[];
  collections: ListedCollectionsType;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const search = puzzlesRoute.useSearch();
  const navigate = puzzlesRoute.useNavigate();
  const pageCount = pageCountFor(puzzles.length);
  const requestedPage = search.page ?? 1;
  const safePage = Math.min(requestedPage, pageCount);
  const paginated = puzzles.slice((safePage - 1) * PAGE_LIMIT, safePage * PAGE_LIMIT);

  // Clamp out-of-range ?page= into a valid page (or drop it on page 1).
  useEffect(() => {
    if (search.page === pageSearchValue(safePage)) return;
    void navigate({
      search: (prev) => ({ ...prev, page: pageSearchValue(safePage) }),
      replace: true
    });
  }, [navigate, safePage, search.page]);

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), pageCount);
    void navigate({
      search: (prev) => ({ ...prev, page: pageSearchValue(clamped) })
    });
    scrollPaginationListToStart(listRef.current);
  };

  if (puzzles.length === 0 && collections.length === 0) return <EmptyState kind="puzzles" />;

  return (
    <>
      <div ref={listRef} className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {safePage === 1
          ? collections.map((collection) => (
              <HubCollectionCard
                key={collection.uid}
                collection={collection}
                showKindBadge
                // Match the puzzle preview cards it sits beside.
                className="rounded-xl border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
              />
            ))
          : null}
        {paginated.map((puzzle) => (
          <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
        ))}
      </div>
      {pageCount > 1 ? (
        <Pagination className="pt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (safePage > 1) goToPage(safePage - 1);
                }}
                aria-disabled={safePage === 1}
              />
            </PaginationItem>
            {getVisiblePages(safePage, pageCount).map((item, index) =>
              item === 'ellipsis' ? (
                <PaginationItem key={`e-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === safePage}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (safePage < pageCount) goToPage(safePage + 1);
                }}
                aria-disabled={safePage === pageCount}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </>
  );
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function resultSummary(
  view: PuzzlesSearch['view'],
  puzzleTotal: number,
  collectionTotal: number,
  page: number | undefined
) {
  if (view === 'collections') return plural(collectionTotal, 'collection');
  const puzzlePart =
    puzzleTotal <= PAGE_LIMIT
      ? plural(puzzleTotal, 'puzzle')
      : (() => {
          const current = Math.min(page ?? 1, pageCountFor(puzzleTotal));
          const start = (current - 1) * PAGE_LIMIT + 1;
          return `${start}–${Math.min(current * PAGE_LIMIT, puzzleTotal)} of ${puzzleTotal}`;
        })();
  return collectionTotal > 0
    ? `${plural(collectionTotal, 'collection')} · ${puzzlePart}`
    : puzzlePart;
}

/** Unified browse: every puzzle across games, filterable by game, tag, and text. */
export default function HubPuzzles({ data }: { data: HubData }) {
  const search = puzzlesRoute.useSearch();
  const navigate = puzzlesRoute.useNavigate();
  const { script, setScript } = useContext(AppContext);
  const { puzzles, byKey } = useHubPuzzles(data);
  // Progressive release: only games with a listed puzzle get a filter chip
  // (padavali/padajala always). A bookmarked `?game=` for a hidden game still
  // resolves — it just shows the empty state.
  const games = data.visibleGames;
  const isCollections = search.view === 'collections';
  // Collections mix games, so the game filter never applies to them (or their topics).
  const game = isCollections ? 'all' : search.game;
  const tags = useMemo(
    () => tagsByPopularity(filterHubPuzzles(puzzles, { game })),
    [puzzles, game]
  );
  const filter = {
    game,
    tags: search.tag ? [search.tag] : [],
    query: search.q
  };
  const filteredPuzzles = filterHubPuzzles(puzzles, filter);
  const filteredCollections = filterHubCollections(data.collections, byKey, {
    ...filter,
    game: 'all'
  });
  // A text search in the puzzle view also surfaces matching collections.
  const searchedCollections = !isCollections && search.q?.trim() ? filteredCollections : [];
  const gameCounts: GameCounts = useMemo(() => {
    const base = filterHubPuzzles(puzzles, {
      tags: search.tag ? [search.tag] : [],
      query: search.q
    });
    // Chips only exist for visible games; hidden games (zero listed puzzles)
    // never appear in `base`, so they naturally keep no count entry.
    const counts: GameCounts = { all: base.length };
    for (const game of games) counts[game] = 0;
    for (const puzzle of base) counts[puzzle.game] = (counts[puzzle.game] ?? 0) + 1;
    return counts;
  }, [puzzles, games, search.tag, search.q]);

  // Collections aren't paginated — drop a leftover ?page= from puzzle view.
  useEffect(() => {
    if (isCollections && search.page != null) {
      void navigate({ search: (prev) => ({ ...prev, page: undefined }), replace: true });
    }
  }, [navigate, isCollections, search.page]);

  // Drop a tag that isn't used by any listed puzzle of the selected game.
  useEffect(() => {
    if (!search.tag || tags.some((tag) => tag.slug === search.tag)) return;
    void navigate({
      search: (prev) => ({ ...prev, tag: undefined, page: undefined }),
      replace: true
    });
  }, [navigate, search.tag, tags]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-slate-50">
              {isCollections ? 'Collections' : 'Puzzles'}
            </h1>
            {/* Phones: script picker beside the title, leaving the search row its width. */}
            <div className="sm:hidden">
              <ScriptSelector script={script} onScriptChange={setScript} compact />
            </div>
          </div>
          <p className="text-sm text-slate-500 sm:text-base dark:text-slate-400">
            {isCollections
              ? 'Curated playlists that mix puzzles from every game.'
              : games.length >= GAME_KINDS.length
                ? 'Every listed puzzle across all six Krida games.'
                : `Every listed puzzle across ${games.length} Krida games.`}
          </p>
        </div>
        <ViewTabs
          view={search.view}
          counts={{ puzzles: filteredPuzzles.length, collections: filteredCollections.length }}
        />
      </header>

      <div className="flex flex-col gap-3">
        {/* Topics sits with search on every screen size, so it never wraps or scrolls away. */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <SearchField />
          </div>
          <TopicsFilter tags={tags} />
          <div className="max-sm:hidden">
            <ScriptSelector script={script} onScriptChange={setScript} compact />
          </div>
        </div>
        <div
          className={cn(
            'flex min-w-0 items-center justify-between gap-3',
            // Collections have no game chips; the count alone is desktop-only.
            isCollections && 'max-sm:hidden'
          )}
        >
          {isCollections ? null : <GameFilters games={games} gameCounts={gameCounts} />}
          <p className="ml-auto hidden shrink-0 text-xs font-medium text-muted-foreground tabular-nums sm:block">
            {resultSummary(
              search.view,
              filteredPuzzles.length,
              isCollections ? filteredCollections.length : searchedCollections.length,
              search.page
            )}
          </p>
        </div>
      </div>

      {isCollections ? (
        filteredCollections.length === 0 ? (
          <EmptyState kind="collections" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {filteredCollections.map((collection) => (
              <HubCollectionCard key={collection.uid} collection={collection} />
            ))}
          </div>
        )
      ) : (
        <PuzzlesGrid puzzles={filteredPuzzles} collections={searchedCollections} />
      )}
    </div>
  );
}
