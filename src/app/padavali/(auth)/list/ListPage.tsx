'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { CalendarIcon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useState } from 'react';
import { client, client_q } from '~/api/client';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { lekhika_typing_tool, load_parivartak_lang_data } from '~/tools/lipi_lekhika';

dayjs.extend(relativeTime);

const PUZZLE_FETCH_LIMIT = 12;

const ListPage = () => {
  const [mounted, setMounted] = useState(false);
  const [pageLastId, setPageLastId] = useState<number | undefined>(undefined);
  const [pageLastCreatedOrUpdatedAt, setPageLastCreatedOrUpdatedAt] = useState<Date | undefined>(
    undefined
  );
  const [moreItemsToFetch, setMoreItemsToFetch] = useState(true);
  const [search_title, setSearchTitle] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(true);
  const [archived_filter_type, setArchivedFilterType] = useState<'all' | 'archived' | 'unarchived'>(
    'all'
  );
  const [sort_by, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');

  // Ensure component is mounted before showing loading states
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    load_parivartak_lang_data('Sanskrit');
  }, []);

  // Debounce search input to avoid redundant requests
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState(search_title);
  const DEBOUNCE_TIME = 400;
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTitle(search_title);
    }, DEBOUNCE_TIME);
    return () => clearTimeout(timeoutId);
  }, [search_title]);

  const puzzle_list_q = client_q.puzzle.get_puzzle_list_page.useQuery(
    {
      limit: PUZZLE_FETCH_LIMIT,
      archived_filter: {
        all: undefined,
        archived: true,
        unarchived: false
      }[archived_filter_type],
      sort_by: sort_by,
      last_id: pageLastId,
      last_created_or_updated_at: pageLastCreatedOrUpdatedAt,
      search_title: debouncedSearchTitle !== '' ? debouncedSearchTitle : undefined
    },
    {
      placeholderData: (prev) => prev,
      refetchOnWindowFocus: false
    }
  );

  const [puzzle_list, setPuuzleList] = useState<
    Awaited<ReturnType<typeof client.puzzle.get_puzzle_list_page.query>>
  >([]);

  useEffect(() => {
    if (puzzle_list_q.isSuccess && !puzzle_list_q.isLoading) {
      setPuuzleList((prev) => [...prev, ...(puzzle_list_q.data ?? [])]);
      const fetched = puzzle_list_q.data ?? [];
      setMoreItemsToFetch(fetched.length === PUZZLE_FETCH_LIMIT || fetched.length === 0);
      // ^ if extactly the number of items fetched is the limit, then there are no more items to fetch
    }
  }, [puzzle_list_q.data, puzzle_list_q.isSuccess, puzzle_list_q.isLoading]);

  useEffect(() => {
    // reset on filter/sort/search
    setPuuzleList([]);
    setPageLastId(undefined);
    setPageLastCreatedOrUpdatedAt(undefined);
    setMoreItemsToFetch(true);
    if (debouncedSearchTitle === '') {
      // manually refetch when search is cleared
      puzzle_list_q.refetch();
    }
  }, [debouncedSearchTitle, archived_filter_type, sort_by]);

  const LoadingSkeletonJSX = () => (
    <>
      {(puzzle_list_q.isLoading || !mounted) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      )}
    </>
  );
  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return <LoadingSkeletonJSX />;
  }

  const handleLoadMore = () => {
    if (puzzle_list.length === 0) return;
    const last = puzzle_list[puzzle_list.length - 1];
    setPageLastId(last.id);
    setPageLastCreatedOrUpdatedAt(last.created_at);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center space-y-3">
        <div className="flex items-center space-x-4">
          <SearchIcon className="mr-2 size-6 text-muted-foreground" />
          <Input
            value={search_title}
            className="w-48 text-sm sm:w-52 lg:w-72"
            onInput={(e) => {
              setSearchTitle(e.currentTarget.value);
              if (lipi_lekhika_typing) {
                // @ts-ignore
                lekhika_typing_tool(
                  e.nativeEvent.target,
                  // @ts-ignore
                  e.nativeEvent.data,
                  'Sanskrit',
                  true,
                  // @ts-ignore
                  (val) => {
                    setSearchTitle(val);
                  }
                );
              }
            }}
            placeholder="शीर्षकेणावेष्यताम्"
          />
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
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="px-1 text-xs font-semibold sm:text-sm">Archived</Label>
            <select
              className="select w-24 rounded-md border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              value={archived_filter_type}
              onChange={(e) =>
                setArchivedFilterType(e.currentTarget.value as typeof archived_filter_type)
              }
            >
              <option value="all">All</option>
              <option value="archived">Archived</option>
              <option value="unarchived">Unarchived</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="px-1 text-xs font-semibold sm:text-sm">Sort By</Label>
            <select
              className="select w-28 rounded-md border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              value={sort_by}
              onChange={(e) => setSortBy(e.currentTarget.value as typeof sort_by)}
            >
              <option value="created_at">Created</option>
              <option value="updated_at">Updated</option>
            </select>
          </div>
        </div>
      </div>
      <LoadingSkeletonJSX />
      {puzzle_list_q.isSuccess && !puzzle_list_q.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {puzzle_list.length > 0 &&
            puzzle_list.map((item) => (
              <div key={item.id}>
                <Link href={`/padavali/edit/${item.id}`}>
                  <Card className="p-2 transition duration-200 hover:bg-gray-100 hover:dark:bg-gray-800">
                    <CardHeader>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                        {item.updated_at &&
                          item.updated_at.getTime() !== item.created_at.getTime() &&
                          item.updated_at.getTime() !== 0 && (
                            <>
                              <span className="text-sm text-muted-foreground">
                                {/* <RefreshCwIcon className="mr-1 inline-block h-3 w-3" /> */}
                                Updated: {dayjs(item.updated_at).fromNow()}
                              </span>
                            </>
                          )}
                        <span className="text-sm text-muted-foreground">
                          <CalendarIcon className="mr-1 inline-block size-3" />
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
      {puzzle_list.length === 0 && (
        <div className="flex items-center justify-center">
          {!puzzle_list_q.isFetching ? (
            <p className="text-lg font-semibold text-gray-500">कोऽपि प्रहेलिका न लब्दा</p>
          ) : (
            <p className="font-semibold text-gray-500">आपूर्यमानम्...</p>
          )}
        </div>
      )}
      {puzzle_list.length > 0 && moreItemsToFetch && (
        <div className="flex items-center justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={puzzle_list_q.isFetching}
            variant="secondary"
            className="font-semibold"
          >
            {puzzle_list_q.isFetching ? 'आपूर्यमानम्...' : 'अधिकापूर्यताम्'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ListPage;
