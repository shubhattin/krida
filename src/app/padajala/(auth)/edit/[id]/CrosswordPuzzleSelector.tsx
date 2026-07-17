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

const CrosswordPuzzleSelector = ({
  selectedPuzzles,
  onSelectedPuzzlesChange,
  locked = false
}: CrosswordPuzzleSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTitle, setSearchTitle] = useState('');
  const [debouncedSearchTitle, setDebouncedSearchTitle] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearchTitle(searchTitle), 400);
    return () => clearTimeout(timeoutId);
  }, [searchTitle]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTitle]);

  const puzzleListQ = useQuery({
    queryKey: ['crossword_selector_list', page, debouncedSearchTitle],
    queryFn: () =>
      client.crossword.get_puzzle_list_page.query({
        page,
        size: PUZZLE_FETCH_LIMIT,
        search_title: debouncedSearchTitle !== '' ? debouncedSearchTitle : undefined,
        sort_by: 'created_at',
        order_by: 'desc'
      }),
    enabled: open,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  const puzzleList = puzzleListQ.data?.list ?? [];
  const hasPrev = puzzleListQ.data?.hasPrev ?? false;
  const hasNext = puzzleListQ.data?.hasNext ?? false;
  const selectedIds = new Set(selectedPuzzles.map((p) => p.id));

  const addPuzzle = (puzzle: SelectedPuzzle) => {
    if (selectedIds.has(puzzle.id)) return;
    onSelectedPuzzlesChange([...selectedPuzzles, puzzle]);
  };

  const removePuzzle = (id: number) => {
    onSelectedPuzzlesChange(selectedPuzzles.filter((p) => p.id !== id));
  };

  return (
    <div className="flex min-h-8 flex-wrap items-center gap-2 rounded-lg border border-slate-200/60 bg-white/50 px-2 py-1.5 dark:border-slate-700/40 dark:bg-slate-800/30">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Puzzles</span>
      {selectedPuzzles.length === 0 ? (
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
                onClick={() => removePuzzle(puzzle.id)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-600"
                aria-label={`Remove ${puzzle.title}`}
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </span>
        ))
      )}
      {!locked && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
              />
            }
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
                {puzzleListQ.isLoading && (
                  <div className="space-y-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                )}
                {puzzleListQ.isSuccess &&
                  puzzleList.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isSelected}
                        onClick={() => addPuzzle({ id: item.id, title: item.title })}
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
                {puzzleListQ.isSuccess && puzzleList.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">No puzzles found</p>
                )}
              </div>

              {(hasPrev || hasNext) && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        text="Prev"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasPrev && !puzzleListQ.isFetching) setPage((p) => p - 1);
                        }}
                        aria-disabled={!hasPrev || puzzleListQ.isFetching}
                        className={cn(
                          (!hasPrev || puzzleListQ.isFetching) && 'pointer-events-none opacity-50'
                        )}
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
                          if (hasNext && !puzzleListQ.isFetching) setPage((p) => p + 1);
                        }}
                        aria-disabled={!hasNext || puzzleListQ.isFetching}
                        className={cn(
                          (!hasNext || puzzleListQ.isFetching) && 'pointer-events-none opacity-50'
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
