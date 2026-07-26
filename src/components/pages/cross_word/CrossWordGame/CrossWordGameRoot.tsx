'use client';

import { Provider, createStore } from 'jotai';
import { useMemo } from 'react';
import type { z } from 'zod';
import { CrossWordGame } from './CrossWordGame';
import {
  celebration_fired_atom,
  completed_atom,
  game_session_nonce_atom,
  incorrect_entry_attempts_atom,
  incorrect_entry_ids_atom,
  letter_inputs_atom,
  numbered_entries_atom,
  player_grid_atom,
  puzzle_atom,
  seconds_atom,
  solved_entry_ids_atom,
  started_atom,
  active_focus_atom,
  pending_navigation_url_atom,
  reveals_used_atom,
  revealing_entry_id_atom,
  revealing_cells_atom
} from './game_state';
import {
  createEmptyPlayerGrid,
  numberEntries,
  type CrossWordGamePuzzle
} from '~/util/cross_word/game_model';
import type { CrossordPuzzle } from '~/db/schema_zod';
import { toCrossWordGamePuzzle } from '~/util/cross_word/adapter';
import type { attachment_schema, image_schema } from '~/db/db_shared_vals';
import type { location_list_type } from '~/db/types';
import type { CrosswordPuzzleType } from '~/util/cache.server/crossword_cache';
import { resolveAttachmentsWithDefaults } from '~/util/puzzle/attachments';
import CrossWordMetricsCollector, { ActiveCrosswordRegistrar } from './CrossWordMetricsCollector';

export type CrossWordGameRootProps = {
  puzzle: CrossordPuzzle | CrosswordPuzzleType | CrossWordGamePuzzle;
  location?: location_list_type;
  attachments?: z.infer<typeof attachment_schema>[];
  image?: z.infer<typeof image_schema> | null;
};

type DbLikePuzzle = CrossordPuzzle | CrosswordPuzzleType;

function isDbPuzzle(puzzle: CrossWordGameRootProps['puzzle']): puzzle is DbLikePuzzle {
  return 'grid_data' in puzzle && 'word_list' in puzzle;
}

export default function CrossWordGameRoot({
  puzzle: raw,
  location = 'main_page',
  attachments: attachmentsProp,
  image
}: CrossWordGameRootProps) {
  const puzzle = isDbPuzzle(raw) ? toCrossWordGamePuzzle(raw as CrossordPuzzle) : raw;

  const listed = isDbPuzzle(raw) ? raw.listed : false;
  const puzzleSlug = isDbPuzzle(raw) ? raw.slug : null;

  const attachments = useMemo(() => {
    const source =
      attachmentsProp ?? (isDbPuzzle(raw) && 'attachments' in raw ? raw.attachments : []);
    return resolveAttachmentsWithDefaults(source ?? []);
  }, [attachmentsProp, raw]);

  void image;

  const jotaiStore = useMemo(() => {
    const store = createStore();
    store.set(puzzle_atom, puzzle);
    store.set(numbered_entries_atom, numberEntries(puzzle.entries));
    store.set(player_grid_atom, createEmptyPlayerGrid(puzzle.grid));
    store.set(started_atom, false);
    store.set(completed_atom, false);
    store.set(seconds_atom, 0);
    store.set(game_session_nonce_atom, 0);
    store.set(active_focus_atom, null);
    store.set(solved_entry_ids_atom, []);
    store.set(incorrect_entry_ids_atom, []);
    store.set(celebration_fired_atom, false);
    store.set(letter_inputs_atom, 0);
    store.set(incorrect_entry_attempts_atom, 0);
    store.set(pending_navigation_url_atom, null);
    store.set(reveals_used_atom, 0);
    store.set(revealing_entry_id_atom, null);
    store.set(revealing_cells_atom, []);
    return store;
  }, [puzzle.id, puzzle]);

  return (
    <>
      <ActiveCrosswordRegistrar puzzleId={puzzle.id} />
      <Provider store={jotaiStore} key={String(puzzle.id)}>
        <CrossWordMetricsCollector puzzle_id={puzzle.id} location={location} />
        <CrossWordGame
          attachments={attachments}
          listed={listed}
          puzzleSlug={puzzleSlug}
          location={location}
        />
      </Provider>
    </>
  );
}
