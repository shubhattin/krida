'use client';

import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { transliterate } from 'lipilekhika';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from '~/state/script_list';
import { motion } from 'framer-motion';
import { Button } from '~/components/ui/button';
import { ArrowLeftIcon, SearchIcon, Sparkles } from 'lucide-react';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import Link from 'next/link';
import { ScriptSelector } from '~/components/pages/main/ScriptSelector';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { AppContext } from '~/components/AppDataContext';
import { cn } from '~/lib/utils';
import { FONT_INFO } from '~/state/script_font_data';
import type { ListedPuzzlesType } from '~/util/cache.server/cache_loaders';
import {
  mapListedPuzzlesForDisplay,
  mergeDisplayPuzzles,
  NORMAL_TITLE_SCRIPT,
  type DisplayPuzzle
} from '~/components/pages/main/listed_puzzle_display';
import { PuzzlePreviewCard } from '~/components/pages/main/PuzzlePreviewCard';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';

type Props = {
  listed_puzzles: ListedPuzzlesType;
  script: ScriptType;
  listed_puzzles_init_transliterated: DisplayPuzzle[];
};

const PAGE_LIMIT = 8 as const;

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
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]!);
  }

  return result;
}

export const ListedPuzzles = ({
  listed_puzzles: listed_puzzles_org,
  listed_puzzles_init_transliterated
}: Props) => {
  const { script } = useContext(AppContext);

  const normal_titles_q = useQuery({
    queryKey: ['listed_puzzle_title_normal', listed_puzzles_org.map((p) => p.id)],
    queryFn: async () =>
      transliterate(
        listed_puzzles_org.map((p) => p.title),
        DEFAULT_DATA_SCRIPT,
        NORMAL_TITLE_SCRIPT,
        {
          'all_to_normal:replace_avagraha_with_a': true,
          'all_to_normal:replace_pancham_varga_varna_with_n': true
        }
      ),
    initialData: listed_puzzles_init_transliterated.every((p) => p.title_normal != null)
      ? listed_puzzles_init_transliterated.map((p) => p.title_normal)
      : undefined,
    staleTime: Infinity
  });

  const listed_puzzle_list_q = useQuery({
    queryKey: ['listed_puzzle_list', 'v2', script],
    queryFn: async () => {
      const puzzle_texts = listed_puzzles_org.flatMap((p) =>
        p.description ? [p.title, p.description] : [p.title]
      );
      const transliterated_texts = await transliterate(puzzle_texts, DEFAULT_DATA_SCRIPT, script);
      return mapListedPuzzlesForDisplay(
        listed_puzzles_org,
        transliterated_texts,
        normal_titles_q.data!
      );
    },
    placeholderData: listed_puzzles_init_transliterated,
    enabled: normal_titles_q.data !== undefined
  });

  const display_puzzles = useMemo((): DisplayPuzzle[] => {
    const rows = listed_puzzle_list_q.data ?? listed_puzzles_init_transliterated;
    return mergeDisplayPuzzles(rows, listed_puzzles_org, normal_titles_q.data);
  }, [
    listed_puzzle_list_q.data,
    listed_puzzles_init_transliterated,
    listed_puzzles_org,
    normal_titles_q.data
  ]);

  return <PuzzleListView puzzles={display_puzzles} />;
};

const PuzzleListView = ({ puzzles }: { puzzles: DisplayPuzzle[] }) => {
  const { script, setScript } = useContext(AppContext);
  const font_info = FONT_INFO[script!];
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(false);

  const typing_ctx = useMemo(() => createTypingContext(script!), [script]);
  useEffect(() => {
    void typing_ctx.ready;
  }, [typing_ctx]);

  const filteredPuzzles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return puzzles;

    return puzzles.filter(
      (puzzle) =>
        puzzle.title.toLowerCase().includes(query) ||
        (puzzle.title_normal?.toLowerCase().includes(query) ?? false) ||
        (puzzle.description_original?.toLowerCase().includes(query) ?? false)
    );
  }, [puzzles, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filteredPuzzles.length / PAGE_LIMIT));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const paginatedPuzzles = filteredPuzzles.slice(
    (safePage - 1) * PAGE_LIMIT,
    safePage * PAGE_LIMIT
  );

  const hasPrev = safePage > 1;
  const hasNext = safePage < pageCount;

  if (puzzles.length === 0) {
    return <EmptyPuzzleList />;
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Button
            render={<Link href="/padavali" className="gap-2" />}
            nativeButton={false}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Home
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 text-center sm:mb-8"
        >
          <div className="mb-4 flex justify-center">
            <div className="rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 p-3 shadow-lg">
              <IoExtensionPuzzleSharp className="size-8 text-white" />
            </div>
          </div>
          <h1 className="mb-2 bg-linear-to-r from-slate-800 to-blue-600 bg-clip-text text-3xl font-bold text-transparent dark:from-slate-100 dark:to-blue-400">
            Padavali Puzzles
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Browse and play all available word puzzles
          </p>
        </motion.div>

        <div className="mb-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <InputGroup className="w-full sm:flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              onBeforeInput={(e) =>
                handleTypingBeforeInputEvent(
                  typing_ctx,
                  e,
                  (newValue) => setSearchQuery(newValue),
                  lipi_lekhika_typing
                )
              }
              onBlur={() => typing_ctx.clearContext()}
              onKeyDown={(e) => {
                if (
                  e.altKey &&
                  (e.key === 'x' || e.key === 'X' || e.key === 'c' || e.key === 'C')
                ) {
                  e.preventDefault();
                  setLipiLekhikaTyping((prev) => !prev);
                  return;
                }
                clearTypingContextOnKeyDown(e, typing_ctx);
              }}
              placeholder="Search by title or description"
              aria-label="Search puzzles"
            />
          </InputGroup>
          <Label className="inline-flex shrink-0 items-center justify-center gap-2 font-medium">
            <Switch
              checked={lipi_lekhika_typing}
              onCheckedChange={setLipiLekhikaTyping}
              className="-mt-1"
              aria-label="Enable Lipi Lekhika typing in search"
            />
            <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
          </Label>
          <div className="flex shrink-0 items-center justify-center gap-2 sm:justify-end">
            <ScriptSelector script={script} onScriptChange={setScript} />
            {font_info.experimental && (
              <span className="inline-flex items-center rounded-full bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                Beta
              </span>
            )}
          </div>
        </div>

        {filteredPuzzles.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
              No puzzles match your search
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
              Try a different title or description
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedPuzzles.map((puzzle, index) => (
                <motion.div
                  key={puzzle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <PuzzlePreviewCard puzzle={puzzle} />
                </motion.div>
              ))}
            </div>

            {pageCount > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        text="Prev"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasPrev) setPage((p) => p - 1);
                        }}
                        aria-disabled={!hasPrev}
                        className={cn(!hasPrev && 'pointer-events-none opacity-50')}
                      />
                    </PaginationItem>
                    {getVisiblePages(safePage, pageCount).map((pageNumber, index) =>
                      pageNumber === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            isActive={pageNumber === safePage}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(pageNumber);
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
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasNext) setPage((p) => p + 1);
                        }}
                        aria-disabled={!hasNext}
                        className={cn(!hasNext && 'pointer-events-none opacity-50')}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const EmptyPuzzleList = () => {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex min-h-screen px-4 pt-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md text-center"
        >
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-linear-to-r from-blue-400 to-indigo-400 opacity-20 blur-xl"></div>
              <div className="relative rounded-full bg-linear-to-r from-blue-500 to-indigo-600 p-6 shadow-2xl">
                <IoExtensionPuzzleSharp className="size-12 text-white" />
              </div>
            </div>
          </div>

          <h1 className="mb-4 bg-linear-to-r from-slate-700 to-blue-600 bg-clip-text text-3xl font-bold text-transparent dark:from-slate-200 dark:to-blue-400">
            No Puzzles Available
          </h1>

          <p className="mb-6 text-lg text-slate-600 dark:text-slate-300">
            There are no listed puzzles yet. Check back later!
          </p>

          <div className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-100 to-indigo-100 px-6 py-3 text-blue-700 shadow-lg dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">New puzzles will appear here</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
