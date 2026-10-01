'use client';

import { HUB_GAMES } from './hub_games';
import type { HubData } from './hub_data';
import { HubHero, type HeroSlide } from './HubHero';
import { HubPosterCard, HubTagTile } from './HubPosterCard';
import { HubShelf } from './HubShelf';
import { resolveCollectionItems, scheduledHubPuzzle, tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';

const SHELF_LIMIT = 16;

/** Cover-first home: spotlight hero plus Netflix-style shelves. */
export default function HubHome({ data }: { data: HubData }) {
  const { puzzles, byKey } = useHubPuzzles(data);
  const padavaliToday = scheduledHubPuzzle('padavali', data.padavali.today, byKey);
  const crosswordToday = scheduledHubPuzzle('crossword', data.crossword.today, byKey);
  const todayPuzzles = [padavaliToday, crosswordToday].filter(
    (puzzle): puzzle is NonNullable<typeof puzzle> => puzzle !== null
  );
  const padavaliPuzzles = puzzles
    .filter((puzzle) => puzzle.game === 'padavali')
    .slice(0, SHELF_LIMIT);
  const crosswordPuzzles = puzzles
    .filter((puzzle) => puzzle.game === 'crossword')
    .slice(0, SHELF_LIMIT);
  const tags = tagsByPopularity(puzzles).slice(0, 18);
  const featuredCollection = data.collections[0];

  const slides: HeroSlide[] = [
    ...todayPuzzles.map((puzzle): HeroSlide => ({
      kind: 'puzzle',
      key: puzzle.key,
      puzzle,
      moreSearch: { game: puzzle.game }
    })),
    ...(featuredCollection
      ? [
          {
            kind: 'collection' as const,
            key: `collection:${featuredCollection.uid}`,
            collection: featuredCollection
          }
        ]
      : [])
  ];

  const tagImage = (slug: string) =>
    puzzles.find((puzzle) => puzzle.image && puzzle.tags.some((tag) => tag.slug === slug))?.image ??
    null;

  return (
    <div className="flex flex-col gap-10 pb-12 sm:gap-12">
      <HubHero slides={slides} />

      <div className="flex flex-col gap-10 sm:gap-12">
        <HubShelf title="Today" seeAll={{ to: '/explore' }} itemCount={todayPuzzles.length}>
          {todayPuzzles.map((puzzle) => (
            <HubPosterCard key={puzzle.key} puzzle={puzzle} />
          ))}
        </HubShelf>

        <HubShelf
          title={HUB_GAMES.padavali.name + ' puzzles'}
          seeAll={{ to: '/explore', search: { game: 'padavali' } }}
          itemCount={padavaliPuzzles.length}
        >
          {padavaliPuzzles.map((puzzle) => (
            <HubPosterCard key={puzzle.key} puzzle={puzzle} />
          ))}
        </HubShelf>

        <HubShelf
          title={HUB_GAMES.crossword.name + ' puzzles'}
          seeAll={{ to: '/explore', search: { game: 'crossword' } }}
          itemCount={crosswordPuzzles.length}
        >
          {crosswordPuzzles.map((puzzle) => (
            <HubPosterCard key={puzzle.key} puzzle={puzzle} />
          ))}
        </HubShelf>

        {data.collections.map((collection) => {
          const items = resolveCollectionItems(collection.items, byKey).slice(0, SHELF_LIMIT);
          return (
            <HubShelf
              key={collection.uid}
              title={collection.title}
              seeAll={{ to: '/collections/$slug', params: { slug: collection.slug } }}
              itemCount={items.length}
            >
              {items.map((puzzle) => (
                <HubPosterCard key={puzzle.key} puzzle={puzzle} />
              ))}
            </HubShelf>
          );
        })}

        <HubShelf title="Browse by topic" seeAll={{ to: '/explore' }} itemCount={tags.length}>
          {tags.map((tag) => (
            <HubTagTile key={tag.id} tag={tag} image={tagImage(tag.slug)} />
          ))}
        </HubShelf>
      </div>
    </div>
  );
}
