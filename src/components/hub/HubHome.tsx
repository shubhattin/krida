'use client';

import { useContext } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Route } from 'lucide-react';
import { GameShowcaseCard, GAMES } from '~/routes/-Landing';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { AppContext } from '~/components/AppDataContext';
import type { HubData } from './hub_data';
import { resolveCollectionItems, tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { HubTodayPair } from './HubTodayCard';
import { HubPathCard } from './HubPathCard';
import { HubPageFrame } from './HubHeader';

export default function HubHome({ data }: { data: HubData }) {
  const { puzzles, byKey } = useHubPuzzles(data);
  const { script, setScript } = useContext(AppContext);
  const tags = tagsByPopularity(puzzles).slice(0, 18);
  const paths = data.collections.map((collection) => ({
    collection,
    items: resolveCollectionItems(collection.items, byKey)
  }));

  return (
    <HubPageFrame>
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-5">
          <Badge variant="secondary" className="w-fit">
            <Route />
            Learning paths
          </Badge>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Learn Sanskrit through games — pick a path
            </h1>
            <p className="max-w-xl text-pretty text-muted-foreground">
              Collections are guided journeys across mixed games. Topics are subjects. Padāvalī and
              Padajāla are ways to play — more games will join the same map.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link to="/explore" search={{ view: 'collections' }} />}
            >
              Browse paths
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link to="/explore" />}>
              Explore puzzles
            </Button>
          </div>
        </div>
        <HubTodayPair
          padavaliToday={data.padavali.today}
          padavaliNext={data.padavali.next_start}
          crosswordToday={data.crossword.today}
          crosswordNext={data.crossword.next_start}
        />
      </section>

      {paths.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Learning paths</h2>
              <p className="text-sm text-muted-foreground">
                Numbered steps in a collection. Start at the first puzzle, or open the full path.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ScriptSelector script={script} onScriptChange={setScript} />
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link to="/explore" search={{ view: 'collections' }} />}
              >
                All paths
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {paths.map(({ collection, items }) => (
              <HubPathCard key={collection.uid} collection={collection} items={items} />
            ))}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Subjects</h2>
            <p className="text-sm text-muted-foreground">Topics shared across every game.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to="/explore"
                search={{ tag: tag.slug }}
                className="flex flex-col gap-1 rounded-xl border bg-card p-3 no-underline ring-1 ring-foreground/10 transition-colors hover:bg-muted"
              >
                <span className="truncate font-medium">{tag.name}</span>
                <span className="text-xs text-muted-foreground">
                  {tag.count} {tag.count === 1 ? 'puzzle' : 'puzzles'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold">Ways to play</h2>
          <p className="text-sm text-muted-foreground">
            The same path can mix word search and crossword. Pick a game to play today.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {GAMES.map((game, index) => (
            <GameShowcaseCard key={game.id} game={game} index={index} />
          ))}
        </div>
      </section>
    </HubPageFrame>
  );
}
