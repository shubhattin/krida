'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, SearchIcon } from 'lucide-react';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { getCDNUrl } from '~/constants';
import type { CrosswordListedPuzzlesType } from '~/util/cache.server/crossword_cache';

type Props = {
  listed_puzzles: CrosswordListedPuzzlesType;
};

export function ListedCrosswordPuzzles({ listed_puzzles }: Props) {
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

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/crossword"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4 shrink-0" />
            Home
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crossword Puzzles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search and play from the listed puzzle archive.
          </p>
        </div>
      </div>

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

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {listed_puzzles.length === 0 ? 'No listed puzzles yet.' : 'No puzzles match your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((puzzle) => {
            const imageUrl = puzzle.image ? getCDNUrl(puzzle.image.s3_key) : null;
            return (
              <Link
                key={puzzle.id}
                href={`/crossword/${encodeURIComponent(puzzle.slug)}`}
                className="group block h-full no-underline"
              >
                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Card className="h-full overflow-hidden border-l-3 border-l-primary/40 transition-all duration-200 group-hover:border-l-primary group-hover:shadow-md">
                    {imageUrl ? (
                      <div className="aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={imageUrl}
                          alt=""
                          className="size-full object-cover object-center"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-16/10 items-center justify-center bg-linear-to-br from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40">
                        <IoExtensionPuzzleSharp className="size-10 text-violet-500/70 dark:text-violet-400/70" />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{puzzle.title}</CardTitle>
                      <CardDescription className="line-clamp-3">
                        {puzzle.description?.trim() || 'Play this crossword puzzle'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
