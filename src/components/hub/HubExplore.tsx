'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { SearchIcon } from 'lucide-react';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { HUB_GAMES } from './hub_games';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { HubCollectionCard } from './HubCollectionCard';
import { collectionGames, filterHubPuzzles, tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';

const exploreRoute = getRouteApi('/_hub/explore');

const GAME_FILTERS = [
  { value: 'all', label: 'All games' },
  { value: 'padavali', label: HUB_GAMES.padavali.name },
  { value: 'crossword', label: HUB_GAMES.crossword.name }
] as const;

export default function HubExplore({ data }: { data: HubData }) {
  const search = exploreRoute.useSearch();
  const navigate = exploreRoute.useNavigate();
  const { script, setScript } = useContext(AppContext);
  const { puzzles } = useHubPuzzles(data);
  const tags = tagsByPopularity(puzzles);
  const [lipiTyping, setLipiTyping] = useState(false);
  const typingCtx = useMemo(() => createTypingContext(script!), [script]);

  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  const filtered = filterHubPuzzles(puzzles, {
    game: search.game,
    tags: search.tag ? [search.tag] : [],
    query: search.q
  });

  const collections = data.collections.filter((collection) => {
    if (search.game !== 'all' && !collectionGames(collection).includes(search.game)) {
      return false;
    }
    const query = search.q?.trim().toLowerCase() ?? '';
    if (!query) return true;
    return (
      collection.title.toLowerCase().includes(query) ||
      collection.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Browse every puzzle, collection, and topic across games.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <InputGroup className="w-full lg:flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={search.q ?? ''}
              onChange={(event) =>
                void navigate({
                  search: (prev) => ({ ...prev, q: event.currentTarget.value || undefined }),
                  replace: true
                })
              }
              onBeforeInput={(event) =>
                handleTypingBeforeInputEvent(
                  typingCtx,
                  event,
                  (value) => {
                    void navigate({
                      search: (prev) => ({ ...prev, q: value || undefined }),
                      replace: true
                    });
                  },
                  lipiTyping
                )
              }
              onBlur={() => typingCtx.clearContext()}
              onKeyDown={(event) => {
                if (
                  event.altKey &&
                  (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
                ) {
                  event.preventDefault();
                  setLipiTyping((prev) => !prev);
                  return;
                }
                clearTypingContextOnKeyDown(event, typingCtx);
              }}
              placeholder="Search puzzles and collections"
              aria-label="Search puzzles"
            />
          </InputGroup>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="inline-flex shrink-0 items-center justify-center gap-2 font-medium">
              <Switch
                checked={lipiTyping}
                onCheckedChange={setLipiTyping}
                aria-label="Enable Lipi Lekhika typing in search"
              />
              <Icon src={LanguageIcon} className="size-6.5" />
            </Label>
            <ScriptSelector script={script} onScriptChange={setScript} />
          </div>
        </div>

        <Tabs
          value={search.view}
          onValueChange={(value) => {
            if (value === 'puzzles' || value === 'collections') {
              void navigate({ search: (prev) => ({ ...prev, view: value }) });
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="puzzles">Puzzles</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          {GAME_FILTERS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={search.game === option.value ? 'secondary' : 'outline'}
              onClick={() => void navigate({ search: (prev) => ({ ...prev, game: option.value }) })}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {tags.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tags.map((tag) => (
              <Button
                key={tag.id}
                size="sm"
                variant={search.tag === tag.slug ? 'secondary' : 'ghost'}
                className="shrink-0"
                onClick={() =>
                  void navigate({
                    search: (prev) => ({
                      ...prev,
                      tag: prev.tag === tag.slug ? undefined : tag.slug
                    })
                  })
                }
              >
                {tag.name}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {search.view === 'collections' ? (
        collections.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            No collections match your filters.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <HubCollectionCard key={collection.uid} collection={collection} />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No puzzles match your filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {filtered.map((puzzle) => (
            <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
          ))}
        </div>
      )}
    </div>
  );
}
