'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { client } from '~/api/client';
import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { cn } from '~/lib/utils';

export type SelectedPuzzle = {
  id: number;
  title: string;
};

const PUZZLE_FETCH_LIMIT = 8;

type CrosswordPuzzleSelectorProps = {
  selectedPuzzles: SelectedPuzzle[];
  onSelectedPuzzlesChange: (puzzles: SelectedPuzzle[]) => void;
  locked?: boolean;
};

/** Debounced mirror of the search box; also resets paging back to the first page. */
function useDebouncedSearchPager(searchTitle: string) {
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTitle(searchTitle);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchTitle]);

  return { debouncedSearchTitle, page, setPage };
}

function useCrosswordSelectorListQuery(page: number, searchTitle: string, open: boolean) {
  const puzzleListQ = useQuery({
    queryKey: ['crossword_selector_list', page, searchTitle],
    queryFn: () =>
      client.crossword.get_puzzle_list_page.query({
        page,
        size: PUZZLE_FETCH_LIMIT,
        search_title: searchTitle !== '' ? searchTitle : undefined,
        sort_by: 'created_at',
        order_by: 'desc'
      }),
    enabled: open,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  return {
    isLoading: puzzleListQ.isLoading,
    isSuccess: puzzleListQ.isSuccess,
    isFetching: puzzleListQ.isFetching,
    puzzleList: puzzleListQ.data?.list ?? [],
    hasPrev: puzzleListQ.data?.hasPrev ?? false,
    hasNext: puzzleListQ.data?.hasNext ?? false
  };
}

const SelectedPuzzleChips = ({
  selectedPuzzles,
  locked,
  onRemove
}: {
  selectedPuzzles: SelectedPuzzle[];
  locked: boolean;
  onRemove: (id: number) => void;
}) =>
  selectedPuzzles.length === 0 ? (
    <span className="px-1 text-sm text-muted-foreground">All puzzles (combined)</span>
  ) : (
    selectedPuzzles.map((puzzle) => (
      <span
        key={puzzle.id}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100 px-2.5 py-0.5 text-sm dark:border-slate-600/60 dark:bg-slate-700/60"
      >
        <span className="max-w-48 truncate">{puzzle.title}</span>
        {!locked && (
          <button
            type="button"
            onClick={() => onRemove(puzzle.id)}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-600"
            aria-label={`Remove ${puzzle.title}`}
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </span>
    ))
  );

const SelectorPagination = ({
  page,
  hasPrev,
  hasNext,
  isFetching,
  onPageChange
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}) => {
  if (!(hasPrev || hasNext)) return null;

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
        <PaginationItem>
          <span className="px-2 text-xs text-muted-foreground">Page {page}</span>
        </PaginationItem>
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

const CrosswordPickerPopover = ({
  open,
  onOpenChange,
  selectedIds,
  onAdd
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<number>;
  onAdd: (puzzle: SelectedPuzzle) => void;
}) => {
  const [searchTitle, setSearchTitle] = useState('');
  const { debouncedSearchTitle, page, setPage } = useDebouncedSearchPager(searchTitle);

  const { isLoading, isSuccess, isFetching, puzzleList, hasPrev, hasNext } =
    useCrosswordSelectorListQuery(page, debouncedSearchTitle, open);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" />}
      >
        <ChevronDownIcon className="size-3.5" />
        Add puzzle
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 sm:w-96" align="start">
        <div className="space-y-3">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              className="text-sm"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.currentTarget.value)}
              placeholder="Search puzzles"
            />
          </InputGroup>

          <div className="max-h-52 space-y-1 overflow-y-auto">
            {isLoading && (
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            )}
            {isSuccess &&
              puzzleList.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => onAdd({ id: item.id, title: item.title })}
                    className={cn(
                      'flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      isSelected
                        ? 'cursor-not-allowed bg-muted/60 text-muted-foreground'
                        : 'hover:bg-accent'
                    )}
                  >
                    <span className="truncate font-medium">{item.title}</span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {item.slug}
                    </span>
                  </button>
                );
              })}
            {isSuccess && puzzleList.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No puzzles found</p>
            )}
          </div>

          <SelectorPagination
            page={page}
            hasPrev={hasPrev}
            hasNext={hasNext}
            isFetching={isFetching}
            onPageChange={setPage}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

const CrosswordPuzzleSelector = ({
  selectedPuzzles,
  onSelectedPuzzlesChange,
  locked = false
}: CrosswordPuzzleSelectorProps) => {
  const [open, setOpen] = useState(false);

  const selectedIds = new Set(selectedPuzzles.map((p) => p.id));

  function addPuzzle(puzzle: SelectedPuzzle) {
    if (selectedIds.has(puzzle.id)) return;
    onSelectedPuzzlesChange([...selectedPuzzles, puzzle]);
  }

  function removePuzzle(id: number) {
    onSelectedPuzzlesChange(selectedPuzzles.filter((p) => p.id !== id));
  }

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2 rounded-lg border border-slate-200/60 bg-white/50 px-2 py-1.5 dark:border-slate-700/40 dark:bg-slate-800/30">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Puzzles</span>
      <SelectedPuzzleChips
        selectedPuzzles={selectedPuzzles}
        locked={locked}
        onRemove={removePuzzle}
      />
      {!locked && (
        <CrosswordPickerPopover
          open={open}
          onOpenChange={setOpen}
          selectedIds={selectedIds}
          onAdd={addPuzzle}
        />
      )}
      {!locked && selectedPuzzles.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => onSelectedPuzzlesChange([])}
        >
          Clear all
        </Button>
      )}
    </div>
  );
};

export default CrosswordPuzzleSelector;
