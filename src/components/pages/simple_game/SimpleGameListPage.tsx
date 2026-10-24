'use client';

import { getCDNUrl } from '~/constants';
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  ArrowUpDownIcon,
  CalendarIcon,
  FilterIcon,
  LayoutGridIcon,
  Link2Icon,
  List,
  SearchIcon,
  TableIcon
} from 'lucide-react';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { client } from '~/api/client';
import { AdminCatalogFilters } from '~/components/pages/catalog/AdminCatalogFilters';
import { CatalogAdminLinks } from '~/components/pages/catalog/CatalogAdminLinks';
import { AdminPuzzleTable } from '~/components/pages/catalog/puzzle_table/AdminPuzzleTable';
import type { AdminPuzzleRow } from '~/components/pages/catalog/puzzle_table/puzzle_table_columns';
import { fetchEveryListPage } from '~/components/pages/fetch-every-list-page';
import { LanguageIcon } from '~/components/icons';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import { Switch } from '~/components/ui/switch';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { SIMPLE_GAME_META, simpleGameEditHref, type SimpleGameKind } from '~/util/games/kinds';

dayjs.extend(relativeTime);

type ListLayout = 'cards' | 'table' | 'links';

const PAGE_SIZE = 12;
/** `simple_game_list_input_schema` caps `size` at 50. */
const FULL_LIST_PAGE_SIZE = 50;

const LISTED_FILTER_ITEMS = [
  { label: 'All', value: 'all' as const },
  { label: 'Listed', value: 'listed' as const },
  { label: 'Unlisted', value: 'unlisted' as const }
];

const SORT_BY_ITEMS = [
  { label: 'Created', value: 'created_at' as const },
  { label: 'Updated', value: 'updated_at' as const }
];

const ORDER_BY_ITEMS = [
  { label: 'Latest', value: 'desc' as const },
  { label: 'Oldest', value: 'asc' as const }
];

function SelectDropdown({ items }: { items: { label: string; value: string }[] }) {
  return (
    <SelectContent alignItemWithTrigger={false}>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

function SimpleGameListSearch({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const ctx = useMemo(() => createTypingContext('Devanagari'), []);
  const [lipi, setLipi] = useState(false);

  useEffect(() => {
    void ctx.ready;
  }, [ctx]);

  const toggleLipi = (event: KeyboardEvent) => {
    if (
      event.altKey &&
      (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault();
      setLipi((prev) => !prev);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <InputGroup className="w-full sm:w-64 lg:w-80">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          className="text-sm"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.currentTarget.value)}
          onBeforeInput={(event) => handleTypingBeforeInputEvent(ctx, event, onChange, lipi)}
          onBlur={() => ctx.clearContext()}
          onKeyDown={(event) => {
            toggleLipi(event);
            clearTypingContextOnKeyDown(event, ctx);
          }}
        />
      </InputGroup>
      <Label className="inline-flex items-center justify-center gap-2 font-medium">
        <Switch
          checked={lipi}
          onCheckedChange={setLipi}
          className="-mt-1"
          aria-label="Lipi Lekhika"
        />
        <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
      </Label>
    </div>
  );
}

function SimpleGameListFilters({
  search,
  onSearchChange,
  placeholder,
  listed,
  onListedChange,
  sortBy,
  onSortByChange,
  orderBy,
  onOrderByChange,
  layout,
  onLayoutChange,
  tagSlug,
  collectionId,
  onTagSlugChange,
  onCollectionIdChange
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  listed: 'all' | 'listed' | 'unlisted';
  onListedChange: (value: 'all' | 'listed' | 'unlisted') => void;
  sortBy: 'created_at' | 'updated_at';
  onSortByChange: (value: 'created_at' | 'updated_at') => void;
  orderBy: 'asc' | 'desc';
  onOrderByChange: (value: 'asc' | 'desc') => void;
  layout: ListLayout;
  onLayoutChange: (layout: ListLayout) => void;
  tagSlug: string;
  collectionId: string;
  onTagSlugChange: (value: string) => void;
  onCollectionIdChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/50 p-3 shadow-sm backdrop-blur-sm sm:p-4 dark:border-slate-700/40 dark:bg-slate-800/30">
      <div className="flex flex-col items-center gap-3">
        <SimpleGameListSearch value={search} onChange={onSearchChange} placeholder={placeholder} />
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Listed filter">
              <List className="size-3.5 sm:size-4" />
              <span className="sr-only">Listed</span>
            </Label>
            <Select
              items={LISTED_FILTER_ITEMS}
              value={listed}
              onValueChange={(value) => {
                if (value === 'all' || value === 'listed' || value === 'unlisted') {
                  onListedChange(value);
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-24 text-xs sm:text-sm"
                aria-label="Listed filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={LISTED_FILTER_ITEMS} />
            </Select>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Sort field">
              <FilterIcon className="size-3.5 sm:size-4" />
              <span className="sr-only">Sort</span>
            </Label>
            <Select
              items={SORT_BY_ITEMS}
              value={sortBy}
              onValueChange={(value) => {
                if (value === 'created_at' || value === 'updated_at') onSortByChange(value);
              }}
            >
              <SelectTrigger size="sm" className="w-28 text-xs sm:text-sm" aria-label="Sort field">
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={SORT_BY_ITEMS} />
            </Select>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Order">
              <ArrowUpDownIcon className="size-3.5 sm:size-4" />
              <span className="sr-only">Order</span>
            </Label>
            <Select
              items={ORDER_BY_ITEMS}
              value={orderBy}
              onValueChange={(value) => {
                if (value === 'asc' || value === 'desc') onOrderByChange(value);
              }}
            >
              <SelectTrigger size="sm" className="w-28 text-xs sm:text-sm" aria-label="Order">
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={ORDER_BY_ITEMS} />
            </Select>
          </div>
          <AdminCatalogFilters
            tagSlug={tagSlug}
            collectionId={collectionId}
            onTagSlugChange={onTagSlugChange}
            onCollectionIdChange={onCollectionIdChange}
          />
          <div className="flex items-center gap-1 rounded-lg border border-slate-200/60 p-0.5 dark:border-slate-700/40">
            <Button
              type="button"
              variant={layout === 'cards' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="Card layout"
              aria-pressed={layout === 'cards'}
              onClick={() => onLayoutChange('cards')}
            >
              <LayoutGridIcon />
            </Button>
            <Button
              type="button"
              variant={layout === 'table' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="Table layout"
              aria-pressed={layout === 'table'}
              onClick={() => onLayoutChange('table')}
            >
              <TableIcon />
            </Button>
            <Button
              type="button"
              variant={layout === 'links' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="Full list"
              title="Full list"
              aria-pressed={layout === 'links'}
              onClick={() => onLayoutChange('links')}
            >
              <Link2Icon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SimpleGameListPage({ kind }: { kind: SimpleGameKind }) {
  const meta = SIMPLE_GAME_META[kind];
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [listed, setListed] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [orderBy, setOrderBy] = useState<'asc' | 'desc'>('desc');
  const [layout, setLayout] = useState<ListLayout>('cards');
  const [tagSlug, setTagSlug] = useState('all');
  const [collectionId, setCollectionId] = useState('all');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const listedFilter = listed === 'all' ? undefined : listed === 'listed';
  const filters = {
    search_title: debounced || undefined,
    listed_filter: listedFilter,
    sort_by: sortBy,
    order_by: orderBy,
    tag_slug: tagSlug === 'all' ? undefined : tagSlug,
    collection_id: collectionId === 'all' ? undefined : Number(collectionId)
  };
  const isFullList = layout === 'links';

  const listQuery = useQuery({
    queryKey: [`${kind}_list`, page, filters],
    queryFn: () => client[kind].get_puzzle_list_page.query({ page, size: PAGE_SIZE, ...filters }),
    placeholderData: (prev) => prev,
    enabled: !isFullList
  });

  const fullListQuery = useQuery({
    queryKey: [`${kind}_list_full`, filters],
    queryFn: () =>
      fetchEveryListPage(
        (page, size) => client[kind].get_puzzle_list_page.query({ page, size, ...filters }),
        FULL_LIST_PAGE_SIZE
      ),
    enabled: isFullList,
    refetchOnWindowFocus: false
  });

  const activeQuery = isFullList ? fullListQuery : listQuery;
  // SAFETY: every simple game's get_puzzle_list_page returns the shared admin row shape.
  const items = ((isFullList ? fullListQuery.data : listQuery.data?.list) ??
    []) as AdminPuzzleRow[];
  const pageCount = listQuery.data?.pageCount ?? 1;
  const isEmpty = !activeQuery.isLoading && items.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <CatalogAdminLinks />
      <SimpleGameListFilters
        search={search}
        onSearchChange={setSearch}
        placeholder={`Search ${meta.name} puzzles`}
        listed={listed}
        onListedChange={(value) => {
          setListed(value);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        orderBy={orderBy}
        onOrderByChange={(value) => {
          setOrderBy(value);
          setPage(1);
        }}
        layout={layout}
        onLayoutChange={setLayout}
        tagSlug={tagSlug}
        collectionId={collectionId}
        onTagSlugChange={(value) => {
          setTagSlug(value);
          setPage(1);
        }}
        onCollectionIdChange={(value) => {
          setCollectionId(value);
          setPage(1);
        }}
      />
      {activeQuery.isLoading ? (
        layout === 'cards' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/60 p-2 dark:border-slate-700/40">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        )
      ) : isEmpty ? (
        <p className="py-8 text-center text-lg font-semibold text-slate-500 dark:text-slate-400">
          No puzzles found
        </p>
      ) : layout === 'table' ? (
        <AdminPuzzleTable game={kind} data={items} />
      ) : isFullList ? (
        <AdminPuzzleTable
          game={kind}
          data={items}
          fullList
          toolbar={
            <p className="mr-auto text-sm text-muted-foreground">
              {items.length} puzzle{items.length === 1 ? '' : 's'}
            </p>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <a key={item.id} href={simpleGameEditHref(kind, item.id)} className="no-underline">
              <Card
                className={cn(
                  'group border-l-3 p-2 shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:shadow-md',
                  meta.accent.border,
                  'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    {item.image ? (
                      <img
                        src={getCDNUrl(item.image.s3_key)}
                        alt=""
                        loading="lazy"
                        className="aspect-[3/2] w-14 shrink-0 rounded-md border border-border/50 object-cover"
                      />
                    ) : null}
                    <CardTitle className="min-w-0 flex-1 text-base">{item.title}</CardTitle>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        item.listed
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-500/10 text-slate-500'
                      )}
                    >
                      {item.listed ? 'Listed' : 'Draft'}
                    </span>
                  </div>
                  <CardDescription className="flex flex-col gap-1">
                    <span className="block truncate font-mono text-xs text-muted-foreground/90">
                      {item.slug}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarIcon className="size-3 shrink-0" />
                      {dayjs(item.created_at).format('MMM D, YYYY')}
                      {item.updated_at &&
                      item.updated_at.getTime() !== item.created_at.getTime() &&
                      item.updated_at.getTime() !== 0
                        ? ` · ${dayjs(item.updated_at).fromNow()}`
                        : null}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>
      )}
      {!isFullList && pageCount > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                {page} / {pageCount}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (page < pageCount) setPage(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
