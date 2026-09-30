import { createServerFn } from '@tanstack/react-start';
import { transliterate_node } from 'lipilekhika/node';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_list';
import { getScript$ } from '~/lib/cache_server_route_data';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import {
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT
} from '~/components/pages/padavali/listed_puzzle_display';
import { runLoaderEffect } from '~/effect/run';

/** Card-sized view of the puzzle currently scheduled for a game (the "daily" puzzle). */
export type HubScheduledPuzzle = {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: { s3_key: string; width: number; height: number } | null;
  end_time: Date;
};

const toScheduled = (
  schedule:
    | {
        end_time: Date;
        puzzle: Omit<HubScheduledPuzzle, 'end_time'>;
      }
    | undefined
): HubScheduledPuzzle | null =>
  schedule
    ? {
        id: schedule.puzzle.id,
        slug: schedule.puzzle.slug,
        title: schedule.puzzle.title,
        description: schedule.puzzle.description,
        image: schedule.puzzle.image,
        end_time: schedule.end_time
      }
    : null;

/**
 * Everything the public hub pages need, from the same caches the per-game pages use:
 * listed puzzles of every game, listed collections, and today's scheduled puzzles.
 */
export const hubData$ = createServerFn({ method: 'GET' }).handler(async () => {
  const [
    padavali_listed,
    crossword_listed,
    collections,
    padavali_current,
    padavali_next,
    crossword_current,
    crossword_next,
    script
  ] = await Promise.all([
    runLoaderEffect(CACHE.padavali.listed_puzzle_list.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.crossword.listed_puzzle_list.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.catalog.listed_collections.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.padavali.current_schedule.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.padavali.next_schedule.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS)),
    runLoaderEffect(CACHE.crossword.next_schedule.get(NO_CACHE_PARAMS)),
    getScript$()
  ]);

  const padavali_today = toScheduled(padavali_current);
  const puzzle_texts = padavali_listed.flatMap((p) =>
    p.description ? [p.title, p.description] : [p.title]
  );
  const [transliterated_texts, normal_titles, padavali_today_title] = await Promise.all([
    transliterate_node(puzzle_texts, DEFAULT_DATA_SCRIPT, script),
    transliterate_node(
      padavali_listed.map((p) => p.title),
      DEFAULT_DATA_SCRIPT,
      NORMAL_TITLE_SCRIPT
    ),
    padavali_today
      ? transliterate_node(padavali_today.title, DEFAULT_DATA_SCRIPT, script)
      : Promise.resolve(null)
  ]);

  return {
    script,
    collections,
    padavali: {
      listed: padavali_listed,
      listed_init_transliterated: mapListedPuzzlesForDisplay(
        padavali_listed,
        transliterated_texts,
        normal_titles
      ),
      today:
        padavali_today && padavali_today_title
          ? { ...padavali_today, title: padavali_today_title }
          : padavali_today,
      next_start: padavali_next?.start_time ?? null
    },
    crossword: {
      listed: crossword_listed,
      today: toScheduled(crossword_current),
      next_start: crossword_next?.start_time ?? null
    }
  };
});

export type HubData = Awaited<ReturnType<typeof hubData$>>;
