'use client';

import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import { LayoutGrid as LayoutGridIcon, SearchIcon, TagIcon, XIcon } from 'lucide-react';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { BrowseModeSwitch } from '~/components/pages/catalog/PublicCatalog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '~/components/ui/input-group';
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

function TopicsFilter({
  tags,
  selected,
  onSelect
}: {
  tags: (PublicTag & { count: number })[];
  selected: string | undefined;
  onSelect: (slug: string | undefined) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const visible = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return tags;
    return tags.filter((tag) => tag.slug.includes(trimmed));
  }, [query, tags]);

  if (tags.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <InputGroupButton
            type="button"
            variant={selected ? 'secondary' : 'ghost'}
            aria-label={selected ? 'Topics, 1 selected' : 'Topics'}
          />
        }
      >
        <TagIcon />
        <span className="hidden sm:inline">Topics</span>
        {selected ? (
          <span className="rounded-full bg-primary/15 px-1.5 text-[11px] font-semibold">1</span>
        ) : null}
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
        <div className="mt-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto">
          {visible.map((tag) => {
            const active = selected === tag.slug;
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onSelect(active ? undefined : tag.slug);
                  setOpen(false);
                }}
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
        {selected ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => onSelect(undefined)}
          >
            Clear
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function GameFilterSwitch({ gameCounts }: { gameCounts: GameCounts }) {
  const search = puzzlesRoute.useSearch();
  const navigate = puzzlesRoute.useNavigate();

  return (
    <div
      role="tablist"
      aria-label="Filter by game"
      className="inline-flex max-w-full items-center rounded-lg border border-border/70 bg-muted/40 p-0.5"
    >
      {GAME_FILTERS.map((option) => {
        const active = search.game === option.value;
        const count = gameCounts[option.value];
        const gameIcon =
          option.value === 'all' ? null : GAME_APP_ICON_SRC[HUB_GAMES[option.value].icon];
        return (
          <Button
            key={option.value}
            size="sm"
            role="tab"
            variant={active ? 'secondary' : 'ghost'}
            aria-selected={active}
            aria-pressed={active}
            onClick={() =>
              void navigate({
                search: (prev) => ({ ...prev, game: option.value, page: undefined })
              })
            }
            className={cn('shrink-0', active && 'shadow-xs')}
          >
            {option.value === 'all' ? (
              <LayoutGridIcon className="size-3.5 shrink-0" aria-hidden />
            ) : gameIcon ? (
              <Image src={gameIcon} alt="" width={14} height={14} className="size-3.5 shrink-0" />
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
  const selectedTag = tags.find((tag) => tag.slug === search.tag);

  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  const setTag = (slug: string | undefined) => {
    void navigate({
      search: (prev) => ({ ...prev, tag: slug, page: undefined })
    });
  };

  const setView = (view: 'puzzles' | 'collections') => {
    void navigate({ search: (prev) => ({ ...prev, view, page: undefined }) });
  };

  return (
    <div className="sticky top-16 z-40 -mx-4 border-y border-border/70 bg-background/90 px-4 py-2.5 backdrop-blur-md sm:py-3">
      <div className="flex flex-col gap-2.5">
        <InputGroup className="w-full">
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
          <InputGroupAddon align="inline-end">
            <TopicsFilter tags={tags} selected={search.tag} onSelect={setTag} />
          </InputGroupAddon>
        </InputGroup>

        <div className="flex items-center justify-center gap-3 sm:hidden">
          <Label className="inline-flex shrink-0 items-center gap-2 font-medium">
            <Switch
              checked={lipiLekhikaTyping}
              onCheckedChange={setLipiLekhikaTyping}
              aria-label="Enable Lipi Lekhika typing in search"
            />
            <Icon src={LanguageIcon} className="size-6.5" />
          </Label>
          <ScriptSelector script={script} onScriptChange={setScript} />
        </div>

        <div className="flex justify-center sm:hidden">
          <BrowseModeSwitch
            mode={search.view}
            onChange={setView}
            puzzleCount={puzzleCount}
            collectionCount={collectionCount}
          />
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="min-w-0 flex-1">
            <BrowseModeSwitch
              mode={search.view}
              onChange={setView}
              puzzleCount={puzzleCount}
              collectionCount={collectionCount}
            />
          </div>
          <Label className="inline-flex shrink-0 items-center gap-2 font-medium">
            <Switch
              checked={lipiLekhikaTyping}
              onCheckedChange={setLipiLekhikaTyping}
              aria-label="Enable Lipi Lekhika typing in search"
            />
            <Icon src={LanguageIcon} className="size-6.5" />
          </Label>
          <ScriptSelector script={script} onScriptChange={setScript} />
        </div>

        <div className="flex justify-center sm:justify-start">
          <GameFilterSwitch gameCounts={gameCounts} />
        </div>

        {selectedTag ? (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setTag(undefined)}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-950/50 dark:text-indigo-200"
              aria-label={`Clear topic ${selectedTag.slug}`}
            >
              {selectedTag.slug}
              <XIcon className="size-3" />
            </button>
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
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:gap-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
          Puzzles
        </h1>
        <p className="hidden text-sm text-slate-500 sm:block dark:text-slate-400">
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
