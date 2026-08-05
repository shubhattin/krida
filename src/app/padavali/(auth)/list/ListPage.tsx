'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  CalendarIcon,
  SearchIcon,
  List,
  FilterIcon,
  ArrowUpDownIcon,
  LayoutGridIcon,
  TableIcon
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useMemo, useSyncExternalStore, useState } from 'react';
import { client, client_q } from '~/api/client';
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
import { Checkbox } from '~/components/ui/checkbox';
import { DataTable } from '~/components/ui/data-table';
import { createListTableColumns } from './list-table-columns';
import { BatchPuzzleImageCostNote } from '~/components/pages/padavali/batch-image/BatchPuzzleImageCostNote';
import { useInvalidatePuzzleImageBatchQueries } from '~/components/pages/padavali/batch-image/usePuzzleImageBatchStatus';
import { toast } from 'sonner';
import { getCDNUrl } from '~/constants';

dayjs.extend(relativeTime);

type ListLayout = 'cards' | 'table';

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

const ListPage = () => {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true
  );
  const [page, setPage] = useState(1);
  const [search_title, setSearchTitle] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(true);
  const [listed_filter_type, setListedFilterType] = useState<'all' | 'listed' | 'unlisted'>('all');
  const [sort_by, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [order_by, setOrderBy] = useState<'asc' | 'desc'>('desc');
  const [layout, setLayout] = useState<ListLayout>('cards');
  const [selected_ids, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [auto_approved, setAutoApproved] = useState(true);
  const { invalidateBatchManager, invalidatePuzzleStatus } =
    useInvalidatePuzzleImageBatchQueries('padavali');

  const batch_trigger_mut = client_q.batch_ai.trigger_batch_puzzle_image_gen.useMutation({
    onSuccess: async (data, variables) => {
      await Promise.all([
        invalidateBatchManager(),
        ...variables.puzzles.map((puzzle) => invalidatePuzzleStatus(puzzle.puzzle_id))
      ]);
      toast.success(
        `Queued background image generation for ${data.puzzle_count} puzzle${data.puzzle_count === 1 ? '' : 's'}.`
      );
      setSelectedIds(new Set());
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to queue background image generation');
    }
  });

  const toggleSelection = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllOnPage = (ids: number[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const ctx = useMemo(() => createTypingContext('Devanagari'), []);

  useEffect(() => {
    void ctx.ready;
  }, [ctx]);

  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState(search_title);
  const DEBOUNCE_TIME = 400;
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTitle(search_title);
      setPage(1);
    }, DEBOUNCE_TIME);
    return () => clearTimeout(timeoutId);
  }, [search_title]);

  const puzzle_list_q = useQuery({
    queryKey: ['puzzle_list', page, debouncedSearchTitle, listed_filter_type, sort_by, order_by],
    queryFn: async () => {
      return client.puzzle.get_puzzle_list_page.query({
        page,
        size: PUZZLE_FETCH_LIMIT,
        listed_filter: {
          all: undefined,
          listed: true,
          unlisted: false
        }[listed_filter_type],
        sort_by,
        search_title: debouncedSearchTitle !== '' ? debouncedSearchTitle : undefined,
        order_by
      });
    },
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  const puzzle_list = useMemo(() => puzzle_list_q.data?.list ?? [], [puzzle_list_q.data?.list]);
  const page_ids = useMemo(() => puzzle_list.map((item) => item.id), [puzzle_list]);
  const table_columns = useMemo(
    () =>
      createListTableColumns({
        selected_ids,
        onToggle: toggleSelection,
        onToggleAll: toggleAllOnPage,
        page_ids
      }),
    [selected_ids, page_ids]
  );
  const displayedTableKey = puzzle_list.map((item) => item.id).join(',');
  const pageCount = puzzle_list_q.data?.pageCount ?? 1;
  const hasPrev = puzzle_list_q.data?.hasPrev ?? false;
  const hasNext = puzzle_list_q.data?.hasNext ?? false;
  const isInitialLoading = puzzle_list_q.isLoading && !puzzle_list_q.data;

  if (!mounted) {
    return <ListLoadingSkeleton show layout="cards" />;
  }

  return (
    <div className="space-y-4">
      {selected_ids.size > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-200/70 bg-blue-50/60 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{selected_ids.size} puzzle(s) selected</p>
            <BatchPuzzleImageCostNote />
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={auto_approved}
                onCheckedChange={(checked) => setAutoApproved(checked === true)}
              />
              Auto apply generated images to puzzles
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={batch_trigger_mut.isPending}
                onClick={() =>
                  batch_trigger_mut.mutate({
                    game: 'padavali',
                    auto_approved,
                    puzzles: [...selected_ids].map((puzzle_id) => ({ puzzle_id }))
                  })
                }
              >
                Generate batch images
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
                disabled={batch_trigger_mut.isPending}
              >
                Clear selection
              </Button>
              <Button
                render={<Link href="/padavali/batch_manager" />}
                nativeButton={false}
                variant="ghost"
              >
                Batch Manager
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="rounded-xl border border-slate-200/60 bg-white/50 p-3 shadow-sm backdrop-blur-sm sm:p-4 dark:border-slate-700/40 dark:bg-slate-800/30">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center gap-3">
            <InputGroup className="w-full sm:w-64 lg:w-80">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                className="text-sm"
                value={search_title}
                onChange={(e) => setSearchTitle(e.currentTarget.value)}
                onBeforeInput={(e) =>
                  handleTypingBeforeInputEvent(
                    ctx,
                    e,
                    (newValue) => setSearchTitle(newValue),
                    lipi_lekhika_typing
                  )
                }
                onBlur={() => ctx.clearContext()}
                onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
                placeholder="Search by title or description"
              />
            </InputGroup>
            <div className="flex justify-center">
              <Label className="inline-flex items-center justify-center gap-2 font-medium">
                <Switch
                  checked={lipi_lekhika_typing}
                  onCheckedChange={setLipiLekhikaTyping}
                  className="-mt-1"
                />
                <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
              </Label>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Label className="px-1 text-xs font-semibold sm:text-sm" title="Listed filter">
                <List className="size-3.5 sm:size-4" />
              </Label>
              <Select
                items={LISTED_FILTER_ITEMS}
                value={listed_filter_type}
                onValueChange={(value) => {
                  if (value) {
                    setListedFilterType(value);
                    setPage(1);
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
                <SelectContent alignItemWithTrigger={false}>
                  {LISTED_FILTER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
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
                  if (value) {
                    setSortBy(value);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-28 text-xs sm:text-sm"
                  aria-label="Sort field"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {SORT_BY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
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
                  if (value) {
                    setOrderBy(value);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger size="sm" className="w-28 text-xs sm:text-sm" aria-label="Order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {ORDER_BY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200/60 p-0.5 dark:border-slate-700/40">
              <Button
                type="button"
                variant={layout === 'cards' ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label="Card layout"
                aria-pressed={layout === 'cards'}
                onClick={() => setLayout('cards')}
              >
                <LayoutGridIcon />
              </Button>
              <Button
                type="button"
                variant={layout === 'table' ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label="Table layout"
                aria-pressed={layout === 'table'}
                onClick={() => setLayout('table')}
              >
                <TableIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ListLoadingSkeleton show={isInitialLoading} layout={layout} />
      {puzzle_list_q.isSuccess &&
        !isInitialLoading &&
        puzzle_list.length > 0 &&
        layout === 'cards' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {puzzle_list.map((item) => (
              <div key={item.id} className="relative">
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox
                    checked={selected_ids.has(item.id)}
                    onCheckedChange={(checked) => toggleSelection(item.id, checked === true)}
                    aria-label={`Select puzzle ${item.title}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {item.image?.s3_key ? (
                  <div className="pointer-events-none absolute top-3 right-3 z-10 size-14 overflow-hidden rounded-md border border-border/80 bg-muted shadow-sm">
                    <Image
                      src={getCDNUrl(item.image.s3_key)}
                      alt=""
                      width={56}
                      height={56}
                      unoptimized
                      className="size-full object-cover"
                    />
                  </div>
                ) : null}
                <Link href={`/padavali/edit/${item.id}`}>
                  <Card
                    className={cn(
                      'group border-l-3 border-l-blue-500/40 p-2 pl-10 shadow-sm transition-all duration-200 hover:translate-x-0.5 hover:border-l-blue-500 hover:bg-slate-50 hover:shadow-md dark:border-l-blue-400/40 dark:hover:border-l-blue-400 dark:hover:bg-slate-800/60',
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
        )}
      {puzzle_list_q.isSuccess &&
        !isInitialLoading &&
        puzzle_list.length > 0 &&
        layout === 'table' && (
          <DataTable
            key={displayedTableKey}
            columns={table_columns}
            data={puzzle_list}
            getRowId={(row) => String(row.id)}
          />
        )}
      {puzzle_list.length === 0 && !isInitialLoading && (
        <div className="flex items-center justify-center">
          {!puzzle_list_q.isFetching ? (
            <p className="text-lg font-semibold text-slate-500 dark:text-slate-400">
              No puzzles found
            </p>
          ) : (
            <p className="font-semibold text-slate-500 dark:text-slate-400">Loading...</p>
          )}
        </div>
      )}
      {pageCount > 1 || puzzle_list_q.data?.total ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Prev"
                onClick={(e) => {
                  e.preventDefault();
                  if (hasPrev && !puzzle_list_q.isFetching) setPage((p) => p - 1);
                }}
                aria-disabled={!hasPrev || puzzle_list_q.isFetching}
                className={cn(
                  (!hasPrev || puzzle_list_q.isFetching) && 'pointer-events-none opacity-50'
                )}
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
                      if (!puzzle_list_q.isFetching) setPage(pageNumber);
                    }}
                    aria-disabled={puzzle_list_q.isFetching}
                    className={cn(puzzle_list_q.isFetching && 'pointer-events-none opacity-50')}
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
                  if (hasNext && !puzzle_list_q.isFetching) setPage((p) => p + 1);
                }}
                aria-disabled={!hasNext || puzzle_list_q.isFetching}
                className={cn(
                  (!hasNext || puzzle_list_q.isFetching) && 'pointer-events-none opacity-50'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : (
        <></>
      )}
    </div>
  );
};

export default ListPage;
