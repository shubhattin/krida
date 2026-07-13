'use client';

import { Provider, createStore } from 'jotai';
import { useMemo } from 'react';
import { CrossWordGame } from './CrossWordGame';
import {
  celebration_fired_atom,
  completed_atom,
  game_session_nonce_atom,
  incorrect_entry_ids_atom,
  numbered_entries_atom,
  player_grid_atom,
  puzzle_atom,
  seconds_atom,
  solved_entry_ids_atom,
  started_atom,
  active_focus_atom
} from './game_state';
import {
  createEmptyPlayerGrid,
  numberEntries,
  type CrossWordGamePuzzle
} from '~/util/cross_word/game_model';
import type { CrossordPuzzle } from '~/db/schema_zod';
import { toCrossWordGamePuzzle } from '~/util/cross_word/adapter';

export type CrossWordGameRootProps = {
  puzzle: CrossordPuzzle | CrossWordGamePuzzle;
};

function isDbPuzzle(puzzle: CrossordPuzzle | CrossWordGamePuzzle): puzzle is CrossordPuzzle {
  return 'grid_data' in puzzle && 'word_list' in puzzle;
}

export default function CrossWordGameRoot({ puzzle: raw }: CrossWordGameRootProps) {
  const puzzle = useMemo(() => (isDbPuzzle(raw) ? toCrossWordGamePuzzle(raw) : raw), [raw]);

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
    return store;
  }, [puzzle.id, puzzle]);

  return (
    <Provider store={jotaiStore} key={String(puzzle.id)}>
      <CrossWordGame />
    </Provider>
  );
}
