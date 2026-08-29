'use client';

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, SearchIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import type { CrosswordListedPuzzlesType } from '~/util/cache.server/crossword_cache';
import { CrosswordPreviewCard } from '~/components/pages/cross_word/CrosswordPreviewCard';
import { GameCrossPromo } from '~/components/GameCrossPromo';

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
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/padajala"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeftIcon className="size-4 shrink-0" />
            Home
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crossword Puzzles</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Search and play from the crossword puzzles.
          </p>
        </div>
      </div>

      {/* Cross-promote Padavali */}
      <GameCrossPromo promote="padavali" toPuzzles />

      <InputGroup>
        <InputGroupAddon>
          <SearchIcon className="text-muted-foreground size-4" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Puzzles"
          aria-label="Search puzzles"
        />
      </InputGroup>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          {listed_puzzles.length === 0 ? 'No listed puzzles yet.' : 'No puzzles match your search.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((puzzle, index) => (
            <motion.div
              key={puzzle.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
              className="h-full"
            >
              <CrosswordPreviewCard puzzle={puzzle} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
