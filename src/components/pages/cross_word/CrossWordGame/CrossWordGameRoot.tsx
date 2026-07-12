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
  type CrossWordPuzzle
} from '~/util/cross_word/cross_word_schema';

export type CrossWordGameRootProps = {
  puzzle: CrossWordPuzzle;
};

export default function CrossWordGameRoot({ puzzle }: CrossWordGameRootProps) {
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
    // Intentionally mount-once; remount via key when puzzle id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Provider store={jotaiStore} key={String(puzzle.id)}>
      <CrossWordGame />
    </Provider>
  );
}
