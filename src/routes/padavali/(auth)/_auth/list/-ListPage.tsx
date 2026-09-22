'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  CalendarIcon,
  SearchIcon,
  List,
  FilterIcon,
  ArrowUpDownIcon,
  LayoutGridIcon,
  TableIcon,
  Link2Icon
} from 'lucide-react';
import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import { client } from '~/api/client';
import { Skeleton } from '~/components/ui/skeleton';
import { Label } from '~/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { cn } from '@/lib/utils';
import { Switch } from '~/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { useQuery } from '@tanstack/react-query';
import { Button } from '~/components/ui/button';
import { DataTable } from '~/components/ui/data-table';
import { listTableColumns, type PuzzleListItem } from './-list-table-columns';
import { getCDNUrl } from '~/constants';
import { fetchEveryListPage } from '~/components/pages/fetch-every-list-page';

dayjs.extend(relativeTime);

type ListLayout = 'cards' | 'table' | 'links';

const ALL_LINKS_PAGE_SIZE = 100;

const PUZZLE_FETCH_LIMIT = 12;

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

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }

  return result;
}

type ListLoadingSkeletonProps = {
  show: boolean;
  layout: ListLayout;
};

const ListLoadingSkeleton = ({ show, layout }: ListLoadingSkeletonProps) => (
  <>
    {show ? (
      layout === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PUZZLE_FETCH_LIMIT }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-slate-200/60 p-2 dark:border-slate-700/40">
          {Array.from({ length: PUZZLE_FETCH_LIMIT }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )
    ) : null}
  </>
);

/** SSR-safe "has mounted" flag so the list only renders after hydration. */
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function useDevanagariTyping() {
  const ctx = useMemo(() => createTypingContext('Devanagari'), []);

  useEffect(() => {
    void ctx.ready;
  }, [ctx]);

  return ctx;
}

const DEBOUNCE_TIME = 400;

/** Debounced mirror of the search box; also resets paging back to the first page. */
function useDebouncedSearch(search_title: string) {
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState(search_title);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTitle(search_title);
    }, DEBOUNCE_TIME);
    return () => clearTimeout(timeoutId);
  }, [search_title]);

  return debouncedSearchTitle;
}

const fetchPuzzleListPage = async (
  page: number,
  search_title: string,
  listed_filter: boolean | undefined,
  sort_by: 'created_at' | 'updated_at',
  order_by: 'asc' | 'desc',
  size = PUZZLE_FETCH_LIMIT
) =>
  client.puzzle.get_puzzle_list_page.query({
    page,
    size,
    listed_filter,
    sort_by,
    search_title: search_title !== '' ? search_title : undefined,
    order_by
  });

function usePuzzleListQuery(
  page: number,
  search_title: string,
  listed_filter_type: 'all' | 'listed' | 'unlisted',
  listed_filter: boolean | undefined,
  sort_by: 'created_at' | 'updated_at',
  order_by: 'asc' | 'desc'
) {
  const puzzle_list_q = useQuery({
    queryKey: [
      'puzzle_list',
      page,
      search_title,
      listed_filter_type,
      listed_filter,
      sort_by,
      order_by
    ],
    queryFn: () => fetchPuzzleListPage(page, search_title, listed_filter, sort_by, order_by),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  return {
    isSuccess: puzzle_list_q.isSuccess,
    isFetching: puzzle_list_q.isFetching,
    total: puzzle_list_q.data?.total,
    puzzle_list: puzzle_list_q.data?.list ?? [],
    pageCount: puzzle_list_q.data?.pageCount ?? 1,
    hasPrev: puzzle_list_q.data?.hasPrev ?? false,
    hasNext: puzzle_list_q.data?.hasNext ?? false,
    isInitialLoading: puzzle_list_q.isLoading && !puzzle_list_q.data
  };
}

const ListSearchBox = ({
  search_title,
  onSearchChange,
  ctx,
  lipi_lekhika_typing,
  onToggleTyping
}: {
  search_title: string;
  onSearchChange: (value: string) => void;
  ctx: ReturnType<typeof createTypingContext>;
  lipi_lekhika_typing: boolean;
  onToggleTyping: (checked: boolean) => void;
}) => (
  <div className="flex items-center gap-3">
    <InputGroup className="w-full sm:w-64 lg:w-80">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        className="text-sm"
        value={search_title}
        onChange={(e) => onSearchChange(e.currentTarget.value)}
        onBeforeInput={(e) =>
          handleTypingBeforeInputEvent(ctx, e, onSearchChange, lipi_lekhika_typing)
        }
        onBlur={() => ctx.clearContext()}
        onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
        placeholder="Search by title or description"
      />
    </InputGroup>
    <div className="flex justify-center">
      <Label className="inline-flex items-center justify-center gap-2 font-medium">
        <Switch checked={lipi_lekhika_typing} onCheckedChange={onToggleTyping} className="-mt-1" />
        <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
      </Label>
    </div>
  </div>
);

const SelectDropdown = ({ items }: { items: { label: string; value: string }[] }) => (
  <SelectContent alignItemWithTrigger={false}>
    {items.map((item) => (
      <SelectItem key={item.value} value={item.value}>
        {item.label}
      </SelectItem>
    ))}
  </SelectContent>
);

const ListFilterBar = ({
  search_title,
  onSearchChange,
  ctx,
  lipi_lekhika_typing,
  onToggleTyping,
  listed_filter_type,
  onListedFilterChange,
  sort_by,
  onSortByChange,
  order_by,
  onOrderByChange,
  layout,
  onLayoutChange
}: {
  search_title: string;
  onSearchChange: (value: string) => void;
  ctx: ReturnType<typeof createTypingContext>;
  lipi_lekhika_typing: boolean;
  onToggleTyping: (checked: boolean) => void;
  listed_filter_type: 'all' | 'listed' | 'unlisted';
  onListedFilterChange: (value: 'all' | 'listed' | 'unlisted') => void;
  sort_by: 'created_at' | 'updated_at';
  onSortByChange: (value: 'created_at' | 'updated_at') => void;
  order_by: 'asc' | 'desc';
  onOrderByChange: (value: 'asc' | 'desc') => void;
  layout: ListLayout;
  onLayoutChange: (layout: ListLayout) => void;
}) => (
  <div className="rounded-xl border border-slate-200/60 bg-white/50 p-3 shadow-sm backdrop-blur-sm sm:p-4 dark:border-slate-700/40 dark:bg-slate-800/30">
    <div className="flex flex-col items-center space-y-3">
      <ListSearchBox
        search_title={search_title}
        onSearchChange={onSearchChange}
        ctx={ctx}
        lipi_lekhika_typing={lipi_lekhika_typing}
        onToggleTyping={onToggleTyping}
      />
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Label className="px-1 text-xs font-semibold sm:text-sm" title="Listed filter">
            <List className="size-3.5 sm:size-4" />
          </Label>
          <Select
            items={LISTED_FILTER_ITEMS}
            value={listed_filter_type}
            onValueChange={(value) => {
              if (value) onListedFilterChange(value);
            }}
          >
            <SelectTrigger size="sm" className="w-24 text-xs sm:text-sm" aria-label="Listed filter">
              <SelectValue />
            </SelectTrigger>
            <SelectDropdown items={LISTED_FILTER_ITEMS} />
          </Select>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Label className="px-1 text-xs font-semibold sm:text-sm" title="Sort field">
            <FilterIcon className="size-3.5 sm:size-4" />
          </Label>
          <Select
            items={SORT_BY_ITEMS}
            value={sort_by}
            onValueChange={(value) => {
              if (value) onSortByChange(value);
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
          </Label>
          <Select
            items={ORDER_BY_ITEMS}
            value={order_by}
            onValueChange={(value) => {
              if (value) onOrderByChange(value);
            }}
          >
            <SelectTrigger size="sm" className="w-28 text-xs sm:text-sm" aria-label="Order">
              <SelectValue />
            </SelectTrigger>
            <SelectDropdown items={ORDER_BY_ITEMS} />
          </Select>
        </div>
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
            aria-label="All puzzle links"
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

const PuzzleCardGrid = ({
  isSuccess,
  isInitialLoading,
  layout,
  puzzle_list
}: {
  isSuccess: boolean;
  isInitialLoading: boolean;
  layout: ListLayout;
  puzzle_list: PuzzleListItem[];
}) => {
  if (!isSuccess || isInitialLoading || layout !== 'cards' || puzzle_list.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {puzzle_list.map((item) => (
        <div key={item.id} className="relative">
          {item.image?.s3_key ? (
            <div className="pointer-events-none absolute top-3 right-3 z-10 size-14 overflow-hidden rounded-md border border-border/80 bg-muted shadow-sm">
              <Image
                src={getCDNUrl(item.image.s3_key)}
                alt=""
                width={56}
                height={56}
                className="size-full object-cover"
              />
            </div>
          ) : null}
          <Link to="/padavali/edit/$id" params={{ id: String(item.id) }}>
            <Card
              className={cn(
                'group border-l-3 border-l-blue-500/40 p-2 shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:border-l-blue-500 hover:bg-slate-50 hover:shadow-md dark:border-l-blue-400/40 dark:hover:border-l-blue-400 dark:hover:bg-slate-800/60',
                item.image?.s3_key && 'pr-20'
              )}
            >
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription className="space-y-1">
                  <span className="block truncate font-mono text-xs text-muted-foreground/90">
                    {item.slug}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-row sm:items-center">
                    {item.updated_at &&
                      item.updated_at.getTime() !== item.created_at.getTime() &&
                      item.updated_at.getTime() !== 0 && (
                        <span className="inline-flex items-center text-sm text-muted-foreground">
                          Updated: {dayjs(item.updated_at).fromNow()}
                        </span>
                      )}
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarIcon className="size-3 shrink-0" />
                      {dayjs(item.created_at).format('MMM D, YYYY')}
                    </span>
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      ))}
    </div>
  );
};

const PuzzleTableView = ({
  isSuccess,
  isInitialLoading,
  layout,
  columns,
  data
}: {
  isSuccess: boolean;
  isInitialLoading: boolean;
  layout: ListLayout;
  columns: typeof listTableColumns;
  data: PuzzleListItem[];
}) => {
  if (!isSuccess || isInitialLoading || layout !== 'table' || data.length === 0) return null;

  return <DataTable columns={columns} data={data} getRowId={(row) => String(row.id)} />;
};

const ListEmptyState = ({
  isEmpty,
  isInitialLoading,
  isFetching
}: {
  isEmpty: boolean;
  isInitialLoading: boolean;
  isFetching: boolean;
}) => {
  if (!isEmpty || isInitialLoading) return null;

  return (
    <div className="flex items-center justify-center">
      {!isFetching ? (
        <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">No puzzles found</p>
      ) : (
        <p className="font-semibold text-slate-500 dark:text-slate-400">Loading...</p>
      )}
    </div>
  );
};

const ListPagination = ({
  page,
  pageCount,
  hasPrev,
  hasNext,
  isFetching,
  total,
  onPageChange
}: {
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  isFetching: boolean;
  total?: number;
  onPageChange: (page: number) => void;
}) => {
  if (!(pageCount > 1 || total)) return <></>;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Prev"
            onClick={(e) => {
              e.preventDefault();
              if (hasPrev && !isFetching) onPageChange(page - 1);
            }}
            aria-disabled={!hasPrev || isFetching}
            className={cn(!hasPrev || isFetching ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
        {getVisiblePages(page, pageCount).map((pageNumber, index) =>
          pageNumber === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                isActive={pageNumber === page}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFetching) onPageChange(pageNumber);
                }}
                aria-disabled={isFetching}
                className={cn(isFetching ? 'pointer-events-none opacity-50' : undefined)}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (hasNext && !isFetching) onPageChange(page + 1);
            }}
            aria-disabled={!hasNext || isFetching}
            className={cn(!hasNext || isFetching ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

const ListPage = () => {
  const mounted = useIsMounted();
  const [page, setPage] = useState(1);
  const [search_title, setSearchTitle] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(true);
  const [listed_filter_type, setListedFilterType] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [sort_by, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [order_by, setOrderBy] = useState<'asc' | 'desc'>('desc');
  const [layout, setLayout] = useState<ListLayout>('cards');

  const debouncedSearchTitle = useDebouncedSearch(search_title);
  const ctx = useDevanagariTyping();

  const listed_filter = { all: undefined, listed: true, unlisted: false }[listed_filter_type];

  const {
    isSuccess,
    isFetching,
    total,
    puzzle_list,
    pageCount,
    hasPrev,
    hasNext,
    isInitialLoading
  } = usePuzzleListQuery(
    page,
    debouncedSearchTitle,
    listed_filter_type,
    listed_filter,
    sort_by,
    order_by
  );

  const all_links_q = useQuery({
    queryKey: [
      'puzzle_list_links',
      debouncedSearchTitle,
      listed_filter_type,
      listed_filter,
      sort_by,
      order_by
    ],
    enabled: layout === 'links',
    queryFn: () =>
      fetchEveryListPage(
        (page, size) =>
          fetchPuzzleListPage(
            page,
            debouncedSearchTitle,
            listed_filter,
            sort_by,
            order_by,
            size
          ),
        ALL_LINKS_PAGE_SIZE
      ),
    refetchOnWindowFocus: false
  });

  function handle_listed_filter_change(value: 'all' | 'listed' | 'unlisted') {
    setListedFilterType(value);
    setPage(1);
  }

  function handle_sort_by_change(value: 'created_at' | 'updated_at') {
    setSortBy(value);
    setPage(1);
  }

  function handle_order_by_change(value: 'asc' | 'desc') {
    setOrderBy(value);
    setPage(1);
  }

  if (!mounted) {
    return <ListLoadingSkeleton show layout="cards" />;
  }

  return (
    <div className="space-y-4">
      <ListFilterBar
        search_title={search_title}
        onSearchChange={setSearchTitle}
        ctx={ctx}
        lipi_lekhika_typing={lipi_lekhika_typing}
        onToggleTyping={setLipiLekhikaTyping}
        listed_filter_type={listed_filter_type}
        onListedFilterChange={handle_listed_filter_change}
        sort_by={sort_by}
        onSortByChange={handle_sort_by_change}
        order_by={order_by}
        onOrderByChange={handle_order_by_change}
        layout={layout}
        onLayoutChange={setLayout}
      />
      <ListLoadingSkeleton show={isInitialLoading && layout !== 'links'} layout={layout} />
      {layout === 'links' && all_links_q.isLoading ? (
        <ListLoadingSkeleton show layout="table" />
      ) : null}
      {layout === 'links' && !all_links_q.isLoading && (all_links_q.data?.length ?? 0) > 0 ? (
        <DataTable
          scrollable
          columns={listTableColumns}
          data={all_links_q.data ?? []}
          getRowId={(row) => String(row.id)}
        />
      ) : null}
      <PuzzleCardGrid
        isSuccess={isSuccess}
        isInitialLoading={isInitialLoading}
        layout={layout}
        puzzle_list={puzzle_list}
      />
      <PuzzleTableView
        isSuccess={isSuccess}
        isInitialLoading={isInitialLoading}
        layout={layout}
        columns={listTableColumns}
        data={puzzle_list}
      />
      <ListEmptyState
        isEmpty={
          layout === 'links'
            ? !all_links_q.isLoading && (all_links_q.data?.length ?? 0) === 0
            : puzzle_list.length === 0
        }
        isInitialLoading={layout === 'links' ? false : isInitialLoading}
        isFetching={layout === 'links' ? all_links_q.isFetching : isFetching}
      />
      {layout === 'links' ? null : (
      <ListPagination
        page={page}
        pageCount={pageCount}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isFetching={isFetching}
        total={total}
        onPageChange={setPage}
      />
      )}
    </div>
  );
};

export default ListPage;
