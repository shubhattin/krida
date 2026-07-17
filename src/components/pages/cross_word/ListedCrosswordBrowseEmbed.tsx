'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import { ExternalLinkIcon, SearchIcon } from 'lucide-react';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { getCDNUrl } from '~/constants';
import type { CrosswordListedPuzzlesType } from '~/util/cache.server/crossword_cache';

const EMBED_PAGE_LIMIT = 8;

type ListedPuzzle = CrosswordListedPuzzlesType[number];

type Props = {
  listed_puzzles: CrosswordListedPuzzlesType;
};

function CrosswordPuzzleCard({ puzzle }: { puzzle: ListedPuzzle }) {
  const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;

  return (
    <Link
      href={`/crossword/${encodeURIComponent(puzzle.slug)}`}
      className="group block h-full no-underline"
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-shadow duration-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="relative aspect-3/2 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="size-full object-cover object-center" />
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40">
              <IoExtensionPuzzleSharp className="size-12 text-violet-500/70 sm:size-14 dark:text-violet-400/70" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3 text-left">
          <div className="line-clamp-2 font-semibold text-slate-900 group-hover:text-violet-600 dark:text-slate-100 dark:group-hover:text-violet-400">
            {puzzle.title}
          </div>
          {puzzle.description ? (
            <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {puzzle.description}
            </div>
          ) : null}
        </div>
      </motion.div>
    </Link>
  );
}

export function ListedCrosswordBrowseEmbed({ listed_puzzles }: Props) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(listed_puzzles, {
        keys: ['title', 'description'],
        threshold: 0.35,
        ignoreLocation: true
      }),
    [listed_puzzles]
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return listed_puzzles;
    return fuse.search(trimmed).map((result) => result.item);
  }, [fuse, listed_puzzles, query]);

  const visible = filtered.slice(0, EMBED_PAGE_LIMIT);

  if (listed_puzzles.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-8">
      <div className="mb-4 flex items-center justify-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800 sm:text-xl dark:text-slate-100">
          Browse puzzles
        </h2>
        <Link
          href="/crossword/puzzles"
          className="flex items-center justify-center gap-0.5 rounded-full border border-violet-200/70 bg-violet-50/80 px-2 py-0.5 text-xs leading-none font-medium text-violet-600 no-underline transition-all duration-150 hover:bg-violet-100 hover:text-violet-700 dark:border-violet-700/50 dark:bg-violet-950/40 dark:text-violet-400 dark:hover:bg-violet-900/50"
        >
          <ExternalLinkIcon className="relative size-3 shrink-0 translate-y-[-1.5px]" />
          <span>View all</span>
        </Link>
      </div>

      <div className="mb-6">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or description…"
            aria-label="Search puzzles"
          />
        </InputGroup>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No puzzles match your search
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {visible.map((puzzle, index) => (
            <motion.div
              key={puzzle.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <CrosswordPuzzleCard puzzle={puzzle} />
            </motion.div>
          ))}
        </div>
      )}

      {filtered.length > EMBED_PAGE_LIMIT ? (
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {EMBED_PAGE_LIMIT} of {filtered.length} matches.{' '}
          <Link
            href="/crossword/puzzles"
            className="font-medium text-violet-600 hover:underline dark:text-violet-400"
          >
            View all
          </Link>
        </p>
      ) : null}
    </div>
  );
}
