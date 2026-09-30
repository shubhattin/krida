'use client';

import { Compass, SearchIcon } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '~/components/ui/empty';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { AppContext } from '~/components/AppDataContext';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { HUB_GAMES } from './hub_games';
import type { HubData } from './hub_data';
import { HubPuzzleCard } from './HubPuzzleCard';
import { HubPathCard } from './HubPathCard';
import { HubPageFrame } from './HubHeader';
import {
  filterHubCollections,
  filterHubPuzzles,
  resolveCollectionItems,
  tagsByPopularity
} from './hub_puzzles';
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
  const { puzzles, byKey } = useHubPuzzles(data);
  const { script, setScript } = useContext(AppContext);
  const [lipiLekhikaTyping, setLipiLekhikaTyping] = useState(false);
  const typingCtx = useMemo(() => createTypingContext(script!), [script]);
  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  const tags = tagsByPopularity(puzzles);
  const filteredPuzzles = filterHubPuzzles(puzzles, {
    game: search.game,
    tags: search.tag ? [search.tag] : [],
    query: search.q
  });
  const filteredCollections = filterHubCollections(data.collections, byKey, {
    game: search.game,
    tags: search.tag ? [search.tag] : [],
    query: search.q
  });

  const setSearch = (patch: Partial<typeof search>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true
    });

  return (
    <HubPageFrame className="gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Search puzzles and learning paths across every game.
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
              onChange={(event) => setSearch({ q: event.currentTarget.value || undefined })}
              onBeforeInput={(event) =>
                handleTypingBeforeInputEvent(
                  typingCtx,
                  event,
                  (newValue) => setSearch({ q: newValue || undefined }),
                  lipiLekhikaTyping
                )
              }
              onBlur={() => typingCtx.clearContext()}
              onKeyDown={(event) => {
                if (
                  event.altKey &&
                  (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
                ) {
                  event.preventDefault();
                  setLipiLekhikaTyping((prev) => !prev);
                  return;
                }
                clearTypingContextOnKeyDown(event, typingCtx);
              }}
              placeholder="Search titles and descriptions"
              aria-label="Search puzzles and paths"
            />
          </InputGroup>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="inline-flex shrink-0 items-center gap-2 font-medium">
              <Switch
                checked={lipiLekhikaTyping}
                onCheckedChange={setLipiLekhikaTyping}
                aria-label="Enable Lipi Lekhika typing in search"
              />
              <Icon src={LanguageIcon} className="size-6" />
            </Label>
            <ScriptSelector script={script} onScriptChange={setScript} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            multiple={false}
            value={[search.view]}
            onValueChange={(values) => {
              const view = values[0];
              if (view === 'puzzles' || view === 'collections') setSearch({ view });
            }}
          >
            <ToggleGroupItem value="puzzles">Puzzles</ToggleGroupItem>
            <ToggleGroupItem value="collections">Paths</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            multiple={false}
            value={[search.game]}
            onValueChange={(values) => {
              const game = values[0];
              if (game === 'all' || game === 'padavali' || game === 'crossword') {
                setSearch({ game });
              }
            }}
          >
            {GAME_FILTERS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button
                key={tag.id}
                size="sm"
                variant={search.tag === tag.slug ? 'secondary' : 'outline'}
                onClick={() => setSearch({ tag: search.tag === tag.slug ? undefined : tag.slug })}
              >
                {tag.name}
                <Badge variant="ghost" className="h-4 px-1">
                  {tag.count}
                </Badge>
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {search.view === 'collections' ? (
        filteredCollections.length === 0 ? (
          <ExploreEmpty
            title="No paths match your filters"
            description="Try another game, topic, or search."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredCollections.map((collection) => (
              <HubPathCard
                key={collection.uid}
                collection={collection}
                items={resolveCollectionItems(collection.items, byKey)}
              />
            ))}
          </div>
        )
      ) : filteredPuzzles.length === 0 ? (
        <ExploreEmpty
          title="No puzzles match your filters"
          description="Try another game, topic, or search."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {filteredPuzzles.map((puzzle) => (
            <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
          ))}
        </div>
      )}
    </HubPageFrame>
  );
}

function ExploreEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Compass />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          {description}{' '}
          <Link to="/explore" search={{ game: 'all', view: 'puzzles' }}>
            Clear filters
          </Link>
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
