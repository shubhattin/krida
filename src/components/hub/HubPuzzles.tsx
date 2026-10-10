'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import { LayoutGrid as LayoutGridIcon, SearchIcon } from 'lucide-react';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { BrowseModeSwitch } from '~/components/pages/catalog/PublicCatalog';
import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
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
import { HUB_GAMES } from './hub_games';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
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
import type { PublicTag } from '~/util/catalog/tags';
import type { PublicGameKind } from '~/util/games/kinds';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';

const puzzlesRoute = getRouteApi('/_hub/puzzles');
const PAGE_LIMIT = 12;

// TODO: add dvayi/bhramita/surupa/anveshi once those games ship on /puzzles.
const GAME_FILTERS: { value: 'all' | PublicGameKind; label: string }[] = [
  { value: 'all', label: 'All games' },
  { value: 'padavali', label: HUB_GAMES.padavali.name },
  { value: 'crossword', label: HUB_GAMES.crossword.name }
];

type GameCounts = Record<'all' | PublicGameKind, number>;

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

function PuzzlesGrid({ puzzles }: { puzzles: HubPuzzle[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const search = puzzlesRoute.useSearch();
  const navigate = puzzlesRoute.useNavigate();
  const pageCount = Math.max(1, Math.ceil(puzzles.length / PAGE_LIMIT));
  const requestedPage = search.page ?? 1;
  const safePage = Math.min(requestedPage, pageCount);
  const paginated = puzzles.slice((safePage - 1) * PAGE_LIMIT, safePage * PAGE_LIMIT);

  // Clamp out-of-range ?page= into a valid page (or drop it on page 1).
  useEffect(() => {
    if (puzzles.length === 0) {
      if (search.page != null) {
        void navigate({
          search: (prev) => ({ ...prev, page: undefined }),
          replace: true
        });
      }
      return;
    }
    if (requestedPage === safePage && (safePage > 1 || search.page == null)) return;
    void navigate({
      search: (prev) => ({ ...prev, page: pageSearchValue(safePage) }),
      replace: true
    });
  }, [navigate, puzzles.length, requestedPage, safePage, search.page]);

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), pageCount);
    void navigate({
      search: (prev) => ({ ...prev, page: pageSearchValue(clamped) })
    });
    scrollPaginationListToStart(listRef.current);
  };

  if (puzzles.length === 0) {
    return <p className="py-12 text-center text-slate-500">No puzzles match your filters.</p>;
  }

  return (
    <>
      <p className="text-xs font-medium text-slate-500">
        {puzzles.length} puzzle{puzzles.length === 1 ? '' : 's'}
      </p>
      <div ref={listRef} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {paginated.map((puzzle) => (
          <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
        ))}
      </div>
      {pageCount > 1 ? (
        <Pagination>
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

function PuzzlesFilterBar({
  tags,
  puzzleCount,
  collectionCount,
  gameCounts
}: {
  tags: (PublicTag & { count: number })[];
  puzzleCount: number;
  collectionCount: number;
  gameCounts: GameCounts;
}) {
  const search = puzzlesRoute.useSearch();
  const navigate = puzzlesRoute.useNavigate();
  const { script, setScript } = useContext(AppContext);
  const [lipiLekhikaTyping, setLipiLekhikaTyping] = useState(false);
  const typingCtx = useMemo(() => createTypingContext(script!), [script]);

  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  return (
    <div className="sticky top-16 z-40 -mx-4 border-y border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <InputGroup className="w-full sm:flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={search.q ?? ''}
              onChange={(event) =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    q: event.currentTarget.value || undefined,
                    page: undefined
                  }),
                  replace: true
                })
              }
              onBeforeInput={(event) =>
                handleTypingBeforeInputEvent(
                  typingCtx,
                  event,
                  (newValue) =>
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        q: newValue || undefined,
                        page: undefined
                      }),
                      replace: true
                    }),
                  lipiLekhikaTyping
                )
              }
              onBlur={() => typingCtx.clearContext()}
              onKeyDown={(event) => {
                if (
                  event.altKey &&
                  (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
                ) {
                  event.preventDefault();
                  setLipiLekhikaTyping((prev) => !prev);
                  return;
                }
                clearTypingContextOnKeyDown(event, typingCtx);
              }}
              placeholder="Search puzzles or collections"
              aria-label="Search puzzles"
            />
          </InputGroup>
          <BrowseModeSwitch
            mode={search.view}
            onChange={(view) =>
              void navigate({ search: (prev) => ({ ...prev, view, page: undefined }) })
            }
            puzzleCount={puzzleCount}
            collectionCount={collectionCount}
          />
          <Label className="inline-flex shrink-0 items-center justify-center gap-2 font-medium">
            <Switch
              checked={lipiLekhikaTyping}
              onCheckedChange={setLipiLekhikaTyping}
              className="-mt-1"
              aria-label="Enable Lipi Lekhika typing in search"
            />
            <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
          </Label>
          <ScriptSelector script={script} onScriptChange={setScript} />
        </div>

        <div className="flex flex-wrap gap-2">
          {GAME_FILTERS.map((option) => {
            const active = search.game === option.value;
            const count = gameCounts[option.value];
            const gameIcon =
              option.value === 'all' ? null : GAME_APP_ICON_SRC[HUB_GAMES[option.value].icon];
            return (
              <Button
                key={option.value}
                size="sm"
                variant={active ? 'secondary' : 'ghost'}
                aria-pressed={active}
                onClick={() =>
                  void navigate({
                    search: (prev) => ({ ...prev, game: option.value, page: undefined })
                  })
                }
                className="inline-flex items-center gap-1.5"
              >
                {option.value === 'all' ? (
                  <LayoutGridIcon className="size-3.5" aria-hidden />
                ) : gameIcon ? (
                  <Image src={gameIcon} alt="" width={14} height={14} className="size-3.5" />
                ) : null}
                {option.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </Button>
            );
          })}
        </div>

        {tags.length > 0 ? (
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {tags.slice(0, 28).map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() =>
                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      tag: prev.tag === tag.slug ? undefined : tag.slug,
                      page: undefined
                    })
                  })
                }
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  search.tag === tag.slug
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300'
                )}
              >
                {tag.slug}
                <span
                  className={cn(
                    'ml-1.5 text-[11px] tabular-nums',
                    search.tag === tag.slug ? 'text-indigo-100' : 'text-slate-400'
                  )}
                >
                  {tag.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PuzzlesCollections({ collections }: { collections: ListedCollectionsType }) {
  if (collections.length === 0) {
    return <p className="py-12 text-center text-slate-500">No collections match your filters.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <HubCollectionCard key={collection.uid} collection={collection} />
      ))}
    </div>
  );
}

/** Unified browse: every puzzle across games, filterable by game, tag, and text. */
export default function HubPuzzles({ data }: { data: HubData }) {
  const search = puzzlesRoute.useSearch();
  const navigate = puzzlesRoute.useNavigate();
  const { puzzles, byKey } = useHubPuzzles(data);
  const tags = useMemo(
    () => tagsByPopularity(filterHubPuzzles(puzzles, { game: search.game })),
    [puzzles, search.game]
  );
  const filter = {
    game: search.game,
    tags: search.tag ? [search.tag] : [],
    query: search.q
  };
  const filteredPuzzles = filterHubPuzzles(puzzles, filter);
  const filteredCollections = filterHubCollections(data.collections, byKey, filter);
  const baseFilter = { tags: search.tag ? [search.tag] : [], query: search.q };

  // Collections aren't paginated — drop a leftover ?page= from puzzle view.
  useEffect(() => {
    if (search.view === 'collections' && search.page != null) {
      void navigate({
        search: (prev) => ({ ...prev, page: undefined }),
        replace: true
      });
    }
  }, [navigate, search.page, search.view]);

  // Drop a tag that isn't used by any listed puzzle of the selected game.
  useEffect(() => {
    if (!search.tag) return;
    if (tags.some((tag) => tag.slug === search.tag)) return;
    void navigate({
      search: (prev) => ({ ...prev, tag: undefined, page: undefined }),
      replace: true
    });
  }, [navigate, search.tag, tags]);
  const basePuzzles = useMemo(
    () => filterHubPuzzles(puzzles, baseFilter),
    // oxlint-disable-next-line exhaustive-deps
    [puzzles, search.tag, search.q]
  );
  const gameCounts: GameCounts = useMemo(
    () => ({
      all: basePuzzles.length,
      padavali: basePuzzles.filter((puzzle) => puzzle.game === 'padavali').length,
      crossword: basePuzzles.filter((puzzle) => puzzle.game === 'crossword').length
    }),
    [basePuzzles]
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          Puzzles
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every listed puzzle across both games — or switch to curated collections.
        </p>
      </div>

      <PuzzlesFilterBar
        tags={tags}
        puzzleCount={filteredPuzzles.length}
        collectionCount={filteredCollections.length}
        gameCounts={gameCounts}
      />

      {search.view === 'collections' ? (
        <PuzzlesCollections collections={filteredCollections} />
      ) : (
        <PuzzlesGrid puzzles={filteredPuzzles} />
      )}
    </div>
  );
}
