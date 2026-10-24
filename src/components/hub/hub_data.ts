import { createServerFn } from '@tanstack/react-start';
import { transliterate_node } from 'lipilekhika/node';
import { z } from 'zod';
import { DEFAULT_DATA_SCRIPT, script_list_enum } from '~/state/script_list';
import { transliterate_custom } from '~/tools/transliterator';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import { getCachedMany } from '~/effect/cache';
import {
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT
} from '~/components/pages/padavali/listed_puzzle_display';
import type { SimpleListedPuzzle } from '~/util/cache.server/simple_game_cache';
import { SIMPLE_GAME_KINDS, type SimpleGameKind } from '~/util/games/kinds';
import { visibleGamesFromCounts } from '~/util/games/visibility';
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
export const hubData$ = createServerFn({ method: 'GET' })
  .validator(z.object({ script: script_list_enum }))
  .handler(async ({ data: { script } }) => {
    // One Redis round trip (MGET) for every cache below; misses fetch individually.
    const {
      padavali_listed,
      padajala_listed,
      dvayi_listed,
      bhramita_listed,
      surupa_listed,
      anveshi_listed,
      collections,
      padavali_current,
      padavali_next,
      padajala_current,
      padajala_next
    } = await runLoaderEffect(
      getCachedMany({
        padavali_listed: CACHE.padavali.listed_puzzle_list.read(NO_CACHE_PARAMS),
        padajala_listed: CACHE.padajala.listed_puzzle_list.read(NO_CACHE_PARAMS),
        dvayi_listed: CACHE.dvayi.listed_puzzle_list.read(NO_CACHE_PARAMS),
        bhramita_listed: CACHE.bhramita.listed_puzzle_list.read(NO_CACHE_PARAMS),
        surupa_listed: CACHE.surupa.listed_puzzle_list.read(NO_CACHE_PARAMS),
        anveshi_listed: CACHE.anveshi.listed_puzzle_list.read(NO_CACHE_PARAMS),
        collections: CACHE.catalog.listed_collections.read(NO_CACHE_PARAMS),
        padavali_current: CACHE.padavali.current_schedule.read(NO_CACHE_PARAMS),
        padavali_next: CACHE.padavali.next_schedule.read(NO_CACHE_PARAMS),
        padajala_current: CACHE.padajala.current_schedule.read(NO_CACHE_PARAMS),
        padajala_next: CACHE.padajala.next_schedule.read(NO_CACHE_PARAMS)
      })
    );

    const padavali_today = toScheduled(padavali_current);
    const puzzle_texts = padavali_listed.flatMap((p) =>
      p.description ? [p.title, p.description] : [p.title]
    );
    const simple_lists = {
      dvayi: dvayi_listed,
      bhramita: bhramita_listed,
      surupa: surupa_listed,
      anveshi: anveshi_listed
    } satisfies Record<SimpleGameKind, SimpleListedPuzzle[]>;
    const simple_texts = SIMPLE_GAME_KINDS.flatMap((kind) => {
      const rows = simple_lists[kind];
      return rows.flatMap((p) => (p.description ? [p.title, p.description] : [p.title]));
    });
    const [transliterated_texts, normal_titles, padavali_today_title, simple_transliterated] =
      await Promise.all([
        transliterate_custom(
          puzzle_texts,
          DEFAULT_DATA_SCRIPT,
          script,
          undefined,
          transliterate_node
        ),
        transliterate_custom(
          padavali_listed.map((p) => p.title),
          DEFAULT_DATA_SCRIPT,
          NORMAL_TITLE_SCRIPT,
          undefined,
          transliterate_node
        ),
        padavali_today
          ? transliterate_custom(
              padavali_today.title,
              DEFAULT_DATA_SCRIPT,
              script,
              undefined,
              transliterate_node
            )
          : Promise.resolve(null),
        transliterate_custom(
          simple_texts,
          DEFAULT_DATA_SCRIPT,
          script,
          undefined,
          transliterate_node
        )
      ]);

    // Slice the flat transliterated array back into per-game display rows.
    let simple_cursor = 0;
    // SAFETY: entries are built from SIMPLE_GAME_KINDS, covering every key exactly once.
    const simple_init = Object.fromEntries(
      SIMPLE_GAME_KINDS.map((kind) => {
        const rows = simple_lists[kind];
        const display = rows.map((puzzle) => {
          const title = simple_transliterated[simple_cursor++]!;
          const description = puzzle.description
            ? simple_transliterated[simple_cursor++]!
            : puzzle.description;
          return { ...puzzle, title, description };
        });
        return [kind, display];
      })
    ) as Record<SimpleGameKind, SimpleListedPuzzle[]>;

    return {
      script,
      collections,
      /**
       * Progressive release gate (zero extra queries — derived from the list
       * lengths above): old games always, new kridas only once they have a
       * listed puzzle. Public UI filters by this; sitemaps/robots ignore it.
       */
      visibleGames: visibleGamesFromCounts({
        padavali: padavali_listed.length,
        padajala: padajala_listed.length,
        dvayi: dvayi_listed.length,
        bhramita: bhramita_listed.length,
        surupa: surupa_listed.length,
        anveshi: anveshi_listed.length
      }),
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
      padajala: {
        listed: padajala_listed,
        today: toScheduled(padajala_current),
        next_start: padajala_next?.start_time ?? null
      },
      dvayi: {
        listed: dvayi_listed,
        listed_init_transliterated: simple_init.dvayi
      },
      bhramita: {
        listed: bhramita_listed,
        listed_init_transliterated: simple_init.bhramita
      },
      surupa: {
        listed: surupa_listed,
        listed_init_transliterated: simple_init.surupa
      },
      anveshi: {
        listed: anveshi_listed,
        listed_init_transliterated: simple_init.anveshi
      }
    };
  });

export type HubData = Awaited<ReturnType<typeof hubData$>>;
