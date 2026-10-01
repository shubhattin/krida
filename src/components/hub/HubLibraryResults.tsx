'use client';

import { useRef } from 'react';
import { SearchX } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '~/components/ui/empty';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { cn } from '~/lib/utils';
import { scrollPaginationListToStart } from '~/lib/pagination-scroll';
import { HubPuzzleCard } from './HubPuzzleCard';
import type { HubPuzzle } from './hub_puzzles';
import { visiblePageNumbers } from './library_search';

export function HubLibraryResults({
  puzzles,
  page,
  pageCount,
  onPageChange,
  onClearFilters,
  hasFilters
}: {
  puzzles: HubPuzzle[];
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  hasFilters: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const goToPage = (next: number) => {
    onPageChange(next);
    scrollPaginationListToStart(listRef.current);
  };

  if (puzzles.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No puzzles match</EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? 'Try another search, game, or topic — or clear everything and browse the full library.'
              : 'There are no listed puzzles yet. Check back soon.'}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters ? (
          <EmptyContent>
            <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  return (
    <div className="flex flex-col gap-6">
      <div ref={listRef} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {puzzles.map((puzzle) => (
          <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
        ))}
      </div>
      {pageCount > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Prev"
                onClick={(event) => {
                  event.preventDefault();
                  if (hasPrev) goToPage(page - 1);
                }}
                aria-disabled={!hasPrev}
                className={cn(!hasPrev && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
            {visiblePageNumbers(page, pageCount).map((pageNumber, index) =>
              pageNumber === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (hasNext) goToPage(page + 1);
                }}
                aria-disabled={!hasNext}
                className={cn(!hasNext && 'pointer-events-none opacity-50')}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
