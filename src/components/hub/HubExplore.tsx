'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { SearchIcon } from 'lucide-react';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { LanguageIcon } from '~/components/icons';
import Icon from '~/tools/Icon';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { Button } from '~/components/ui/button';
import { HUB_GAMES } from './hub_games';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { CollectionFeatureCard } from './CollectionFeatureCard';
import { filterHubPuzzles, tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';

const exploreRoute = getRouteApi('/_hub/explore');

const GAME_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'padavali', label: HUB_GAMES.padavali.name },
  { value: 'crossword', label: HUB_GAMES.crossword.name }
] as const;

function isExploreView(value: string | undefined): value is 'puzzles' | 'collections' {
  return value === 'puzzles' || value === 'collections';
}

function isExploreGame(value: string | undefined): value is 'all' | 'padavali' | 'crossword' {
  return value === 'all' || value === 'padavali' || value === 'crossword';
}

export default function HubExplore({ data }: { data: HubData }) {
  const search = exploreRoute.useSearch();
  const navigate = exploreRoute.useNavigate();
  const { script, setScript } = useContext(AppContext);
  const { puzzles } = useHubPuzzles(data);
  const tags = tagsByPopularity(puzzles);
  const filtered = filterHubPuzzles(puzzles, {
    game: search.game,
    tags: search.tag ? [search.tag] : [],
    query: search.q
  });
  const [lipiTyping, setLipiTyping] = useState(false);
  const typingCtx = useMemo(() => createTypingContext(script), [script]);

  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  const collections =
    search.game === 'all'
      ? data.collections
      : data.collections.filter((collection) =>
          collection.items.some((item) => item.game === search.game)
        );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-3">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Library
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Explore</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Every listed puzzle, collection, and topic — filter by game or search in your script.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <InputGroup className="h-10">
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
                (next) =>
                  void navigate({
                    search: (prev) => ({ ...prev, q: next || undefined }),
                    replace: true
                  }),
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
            placeholder="Search puzzles"
            aria-label="Search puzzles"
          />
        </InputGroup>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              value={[search.view]}
              onValueChange={(value) => {
                const next = value[0];
                if (!isExploreView(next)) return;
                void navigate({ search: (prev) => ({ ...prev, view: next }) });
              }}
              variant="outline"
              size="sm"
              spacing={0}
            >
              <ToggleGroupItem value="puzzles">Puzzles</ToggleGroupItem>
              <ToggleGroupItem value="collections">Collections</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              value={[search.game]}
              onValueChange={(value) => {
                const next = value[0];
                if (!isExploreGame(next)) return;
                void navigate({ search: (prev) => ({ ...prev, game: next }) });
              }}
              variant="outline"
              size="sm"
              spacing={0}
            >
              {GAME_FILTERS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={lipiTyping}
                onCheckedChange={setLipiTyping}
                aria-label="Enable Lipi Lekhika typing in search"
              />
              <Icon src={LanguageIcon} className="size-5" />
            </Label>
            <ScriptSelector script={script} onScriptChange={setScript} />
          </div>
        </div>

        {tags.length > 0 && search.view === 'puzzles' ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Button
                key={tag.id}
                size="xs"
                variant={search.tag === tag.slug ? 'secondary' : 'outline'}
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
          <p className="py-16 text-center font-serif text-lg text-muted-foreground italic">
            No collections match this game.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {collections.map((collection) => (
              <CollectionFeatureCard key={collection.uid} collection={collection} />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center font-serif text-lg text-muted-foreground italic">
          No puzzles match your filters.
        </p>
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
