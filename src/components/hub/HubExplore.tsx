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
import { LanguageIcon } from '~/components/icons';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { Button } from '~/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import Icon from '~/tools/Icon';
import { HUB_GAMES } from './hub_games';
import type { HubData } from './hub_data';
import { HubCollectionPoster, HubPosterGridCard } from './HubPosterCard';
import { filterHubPuzzles, tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';

const exploreRoute = getRouteApi('/_hub/explore');

const GAME_FILTERS = [
  { value: 'all' as const, label: 'All games' },
  { value: 'padavali' as const, label: HUB_GAMES.padavali.name },
  { value: 'crossword' as const, label: HUB_GAMES.crossword.name }
];

/** Sticky filter bar + cover poster grid, driven by URL search params. */
export default function HubExplore({ data }: { data: HubData }) {
  const search = exploreRoute.useSearch();
  const navigate = exploreRoute.useNavigate();
  const { puzzles } = useHubPuzzles(data);
  const { script, setScript } = useContext(AppContext);
  const [lipiTyping, setLipiTyping] = useState(false);
  const typingCtx = useMemo(() => createTypingContext(script), [script]);

  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  const tags = tagsByPopularity(puzzles);
  const filtered = filterHubPuzzles(puzzles, {
    game: search.game,
    tags: search.tag ? [search.tag] : [],
    query: search.q
  });
  const collections =
    search.game && search.game !== 'all'
      ? data.collections.filter((collection) =>
          collection.items.some((item) => item.game === search.game)
        )
      : data.collections;
  const isCollections = search.view === 'collections';

  return (
    <div className="flex flex-col">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-3 px-4 pt-6 sm:px-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {isCollections ? 'Collections' : 'Explore'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isCollections
            ? 'Curated paths across word search and crossword puzzles.'
            : 'Every listed puzzle, one shelf at a time.'}
        </p>
      </div>
      <div className="sticky top-16 z-30 border-b border-border/50 bg-[#f3efe6]/90 backdrop-blur-xl dark:bg-[#0b0d12]/90">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-3 sm:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <InputGroup className="h-9 w-full lg:max-w-md">
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
                    (event.key === 'x' ||
                      event.key === 'X' ||
                      event.key === 'c' ||
                      event.key === 'C')
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

            <div className="flex flex-wrap items-center gap-2">
              {GAME_FILTERS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={search.game === option.value ? 'secondary' : 'ghost'}
                  onClick={() =>
                    void navigate({ search: (prev) => ({ ...prev, game: option.value }) })
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <Button
                size="sm"
                variant={!isCollections ? 'secondary' : 'ghost'}
                onClick={() => void navigate({ search: (prev) => ({ ...prev, view: 'puzzles' }) })}
              >
                Puzzles
              </Button>
              <Button
                size="sm"
                variant={isCollections ? 'secondary' : 'ghost'}
                onClick={() =>
                  void navigate({ search: (prev) => ({ ...prev, view: 'collections' }) })
                }
              >
                Collections
              </Button>
              <Label className="inline-flex shrink-0 items-center gap-2 font-medium">
                <Switch
                  checked={lipiTyping}
                  onCheckedChange={setLipiTyping}
                  aria-label="Enable Lipi Lekhika typing in search"
                />
                <Icon src={LanguageIcon} className="size-6" />
              </Label>
              <ScriptSelector script={script} onScriptChange={setScript} />
            </div>
          </div>

          {tags.length > 0 && !isCollections ? (
            <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {tags.map((tag) => {
                const active = search.tag === tag.slug;
                return (
                  <Button
                    key={tag.id}
                    size="sm"
                    variant={active ? 'secondary' : 'outline'}
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
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[90rem] px-4 py-6 sm:px-8">
        {isCollections ? (
          collections.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No collections yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {collections.map((collection) => (
                <HubCollectionPoster
                  key={collection.uid}
                  collection={collection}
                  className="w-full sm:w-full md:w-full lg:w-full"
                />
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No puzzles match your filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((puzzle) => (
              <HubPosterGridCard key={puzzle.key} puzzle={puzzle} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
