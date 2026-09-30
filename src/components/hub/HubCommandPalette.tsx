'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Hash, LayoutGrid, SearchIcon } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '~/components/ui/command';
import { GameAppIcon } from '~/components/GameAppIcon';
import { hubData$, type HubData } from './hub_data';
import { HUB_GAME_LIST } from './hub_games';
import { filterHubPuzzles, tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { matchesWordSearch } from '~/util/puzzle/search';
import { HubGameBadge } from './HubGameBadge';
import { serializeLibraryTags } from './library_search';

const PUZZLE_LIMIT = 20;

function HubCommandResults({
  data,
  query,
  onClose
}: {
  data: HubData;
  query: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { puzzles } = useHubPuzzles(data);
  const puzzleHits = useMemo(
    () => filterHubPuzzles(puzzles, { query }).slice(0, PUZZLE_LIMIT),
    [puzzles, query]
  );
  const collectionHits = useMemo(
    () =>
      data.collections.filter((collection) =>
        matchesWordSearch([collection.title, collection.description], query)
      ),
    [data.collections, query]
  );
  const tagHits = useMemo(() => {
    const all = tagsByPopularity(puzzles);
    const tokens = query.trim().toLowerCase();
    if (!tokens) return all.slice(0, 12);
    return all
      .filter((tag) => tag.name.toLowerCase().includes(tokens) || tag.slug.includes(tokens))
      .slice(0, 12);
  }, [puzzles, query]);

  return (
    <CommandList>
      <CommandEmpty>No matches. Try a different word or topic.</CommandEmpty>
      <CommandGroup heading="Games">
        {HUB_GAME_LIST.map((game) => (
          <CommandItem
            key={game.kind}
            value={`${game.name} ${game.subtitle} ${game.description}`}
            onSelect={() => {
              onClose();
              void navigate({ to: game.href });
            }}
          >
            <GameAppIcon
              game={game.icon}
              name={game.name}
              size="sm"
              className="size-8 rounded-lg"
            />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{game.name}</span>
              <span className="ml-2 text-muted-foreground">{game.subtitle}</span>
            </span>
          </CommandItem>
        ))}
        <CommandItem
          value="All games library puzzles"
          onSelect={() => {
            onClose();
            void navigate({ to: '/' });
          }}
        >
          <LayoutGrid />
          Browse the library
        </CommandItem>
      </CommandGroup>
      {puzzleHits.length > 0 ? (
        <CommandGroup heading="Puzzles">
          {puzzleHits.map((puzzle) => (
            <CommandItem
              key={puzzle.key}
              value={`${puzzle.title} ${puzzle.description} ${puzzle.game}`}
              onSelect={() => {
                onClose();
                void navigate({ to: puzzle.href });
              }}
            >
              <SearchIcon />
              <span className="min-w-0 flex-1 truncate">{puzzle.title}</span>
              <HubGameBadge game={puzzle.game} />
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {collectionHits.length > 0 ? (
        <CommandGroup heading="Collections">
          {collectionHits.map((collection) => (
            <CommandItem
              key={collection.uid}
              value={`${collection.title} ${collection.description} collection`}
              onSelect={() => {
                onClose();
                void navigate({
                  to: '/collections/$slug',
                  params: { slug: collection.slug }
                });
              }}
            >
              <FolderOpen />
              <span className="min-w-0 flex-1 truncate">{collection.title}</span>
              <span className="text-xs text-muted-foreground">{collection.items.length}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
      {tagHits.length > 0 ? (
        <CommandGroup heading="Topics">
          {tagHits.map((tag) => (
            <CommandItem
              key={tag.id}
              value={`${tag.name} ${tag.slug} topic tag`}
              onSelect={() => {
                onClose();
                void navigate({
                  to: '/',
                  search: { tags: serializeLibraryTags([tag.slug]) }
                });
              }}
            >
              <Hash />
              <span className="min-w-0 flex-1 truncate">{tag.name}</span>
              <span className="text-xs text-muted-foreground">{tag.count}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : null}
    </CommandList>
  );
}

export function HubCommandPalette({
  data,
  open,
  onOpenChange
}: {
  data?: HubData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const fetched = useQuery({
    queryKey: ['hubData'],
    queryFn: () => hubData$(),
    enabled: open && !data,
    staleTime: 60_000
  });
  const resolved = data ?? fetched.data ?? null;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
      title="Search the library"
      description="Jump to a puzzle, collection, topic, or game."
      shouldFilter={false}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search puzzles, collections, topics…"
      />
      {resolved ? (
        <HubCommandResults data={resolved} query={query} onClose={() => onOpenChange(false)} />
      ) : (
        <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading library…</div>
      )}
    </CommandDialog>
  );
}

export function useHubCommandOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return { open, setOpen };
}
