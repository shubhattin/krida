'use client';

import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, SearchIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import type { CrosswordListedPuzzlesType } from '~/util/cache.server/crossword_cache';
import { CrosswordPreviewCard } from '~/components/pages/cross_word/CrosswordPreviewCard';
import { ExploreCatalogLink, ExplorePromo } from '~/components/ExplorePromo';
import { useCrosswordListedPuzzles } from '~/components/pages/cross_word/useCrosswordListedPuzzles';
import type { ListedCollectionsType } from '~/util/cache.server/collection_cache';
import {
  BrowseModeSwitch,
  matchesSelectedTags,
  PublicCollections,
  TagFilterPopover,
  uniqueTags
} from '~/components/pages/catalog/PublicCatalog';

type Props = {
  listed_puzzles: CrosswordListedPuzzlesType;
  listed_collections: ListedCollectionsType;
};

export function ListedCrosswordPuzzles({
  listed_puzzles: listed_puzzles_init,
  listed_collections
}: Props) {
  const [query, setQuery] = useState('');
  const [browseMode, setBrowseMode] = useState<'puzzles' | 'collections'>('puzzles');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const listed_puzzles = useCrosswordListedPuzzles(listed_puzzles_init);

  const fuse = useMemo(
    () =>
      new Fuse(listed_puzzles, {
        keys: ['title', 'description'],
        threshold: 0.35,
        ignoreLocation: true
      }),
    [listed_puzzles]
  );

  const searched = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return listed_puzzles;
    return fuse.search(trimmed).map((result) => result.item);
  }, [fuse, listed_puzzles, query]);
  const filtered = useMemo(
    () => searched.filter((puzzle) => matchesSelectedTags(puzzle.tags, selectedTags)),
    [searched, selectedTags]
  );

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/padajala"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4 shrink-0" />
            Home
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crossword Puzzles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search and play from the crossword puzzles.
          </p>
          <div className="mt-3">
            <ExploreCatalogLink />
          </div>
        </div>
      </div>

      <ExplorePromo />

      <div className="flex flex-wrap items-center gap-2">
        <BrowseModeSwitch mode={browseMode} onChange={setBrowseMode} />
        <TagFilterPopover
          tags={uniqueTags(listed_puzzles)}
          selected={selectedTags}
          onChange={setSelectedTags}
        />
      </div>

      <InputGroup>
        <InputGroupAddon>
          <SearchIcon className="size-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Puzzles"
          aria-label="Search puzzles"
        />
      </InputGroup>

      {browseMode === 'collections' ? (
        <PublicCollections
          collections={listed_collections}
          game="crossword"
          puzzles={listed_puzzles}
        />
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
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
