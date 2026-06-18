'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { CalendarIcon, SearchIcon, ArchiveIcon, FilterIcon, ArrowUpDownIcon } from 'lucide-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useState } from 'react';
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

dayjs.extend(relativeTime);

const PUZZLE_FETCH_LIMIT = 12;

const ARCHIVED_FILTER_ITEMS = [
  { label: 'All', value: 'all' as const },
  { label: 'Archived', value: 'archived' as const },
  { label: 'Unarchived', value: 'unarchived' as const }
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

const ListPage = () => {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [search_title, setSearchTitle] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(true);
  const [archived_filter_type, setArchivedFilterType] = useState<'all' | 'archived' | 'unarchived'>(
    'all'
  );
  const [sort_by, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [order_by, setOrderBy] = useState<'asc' | 'desc'>('desc');

  const ctx = createTypingContext('Devanagari');

  useEffect(() => {
    ctx.ready;
  }, [ctx]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState(search_title);
  const DEBOUNCE_TIME = 400;
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTitle(search_title);
    }, DEBOUNCE_TIME);
    return () => clearTimeout(timeoutId);
  }, [search_title]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTitle, archived_filter_type, sort_by, order_by]);

  const puzzle_list_q = useQuery({
    queryKey: ['puzzle_list', page, debouncedSearchTitle, archived_filter_type, sort_by, order_by],
    queryFn: async () => {
      return client.puzzle.get_puzzle_list_page.query({
        page,
        size: PUZZLE_FETCH_LIMIT,
        archived_filter: {
          all: undefined,
          archived: true,
          unarchived: false
        }[archived_filter_type],
        sort_by,
        search_title: debouncedSearchTitle !== '' ? debouncedSearchTitle : undefined,
        order_by
      });
    },
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  const puzzle_list = puzzle_list_q.data?.list ?? [];
  const pageCount = puzzle_list_q.data?.pageCount ?? 1;
  const hasPrev = puzzle_list_q.data?.hasPrev ?? false;
  const hasNext = puzzle_list_q.data?.hasNext ?? false;
  const isInitialLoading = puzzle_list_q.isLoading && !puzzle_list_q.data;

  const LoadingSkeletonJSX = () => (
    <>
      {(isInitialLoading || !mounted) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PUZZLE_FETCH_LIMIT }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      )}
    </>
  );

  if (!mounted) {
    return <LoadingSkeletonJSX />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center space-y-3">
        <div className="flex items-center space-x-4">
          <InputGroup className="w-48 sm:w-52 lg:w-72">
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
              placeholder="Search by title"
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
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Archived filter">
              <ArchiveIcon className="size-3.5 sm:size-4" />
            </Label>
            <Select
              items={ARCHIVED_FILTER_ITEMS}
              value={archived_filter_type}
              onValueChange={(value) => {
                if (value) setArchivedFilterType(value);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-24 text-xs sm:text-sm"
                aria-label="Archived filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {ARCHIVED_FILTER_ITEMS.map((item) => (
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
                if (value) setSortBy(value);
              }}
            >
              <SelectTrigger size="sm" className="w-28 text-xs sm:text-sm" aria-label="Sort field">
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
                if (value) setOrderBy(value);
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
        </div>
      </div>
      <LoadingSkeletonJSX />
      {puzzle_list_q.isSuccess && !isInitialLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {puzzle_list.length > 0 &&
            puzzle_list.map((item) => (
              <div key={item.id}>
                <Link href={`/padavali/edit/${item.id}`}>
                  <Card className="p-2 transition duration-200 hover:bg-gray-100 hover:dark:bg-gray-800">
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-row sm:items-center">
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
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            ))}
        </div>
      )}
      {puzzle_list.length === 0 && !isInitialLoading && (
        <div className="flex items-center justify-center">
          {!puzzle_list_q.isFetching ? (
            <p className="text-lg font-semibold text-gray-500">No puzzles found</p>
          ) : (
            <p className="font-semibold text-gray-500">Loading...</p>
          )}
        </div>
      )}
      {(pageCount > 1 || puzzle_list_q.data?.total) && (
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
      )}
    </div>
  );
};

export default ListPage;
