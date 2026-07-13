'use client';

import { type RefObject, useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import {
  active_focus_atom,
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
  type ActiveFocus
} from './game_state';
import {
  createEmptyPlayerGrid,
  findEntriesAtCell,
  getEntryCells,
  isEditableCell,
  isEntryCorrect,
  isEntryFilled,
  isFixedCell,
  nextCellInEntry,
  nextPlayableCell,
  type CrossWordDirection,
  type CrossWordEntry,
  type CrossWordGamePuzzle,
  type NumberedEntry
} from '~/util/cross_word/game_model';

function pickPreferredEntry(
  covering: CrossWordEntry[],
  preferredDirection?: CrossWordDirection,
  previousEntryId?: string
) {
  if (preferredDirection) {
    const match = covering.find((entry) => entry.direction === preferredDirection);
    if (match) return match;
  }
  if (previousEntryId) {
    const prev = covering.find((entry) => entry.id === previousEntryId);
    if (prev) return prev;
  }
  return covering[0] ?? null;
}

function evaluateEntries(
  entries: NumberedEntry[],
  playerGrid: (string | null)[][],
  puzzle: CrossWordGamePuzzle
) {
  const solved: string[] = [];
  const incorrect: string[] = [];

  for (const entry of entries) {
    if (!isEntryFilled(entry, playerGrid, puzzle.grid)) continue;
    if (isEntryCorrect(entry, playerGrid, puzzle.grid)) {
      solved.push(entry.id);
    } else {
      incorrect.push(entry.id);
    }
  }

  return { solved, incorrect, allSolved: solved.length === entries.length && entries.length > 0 };
}

export function useCrossWordGame(timerRef: RefObject<ReturnType<typeof setInterval> | null>) {
  const store = useStore();
  const puzzle = useAtomValue(puzzle_atom);
  const entries = useAtomValue(numbered_entries_atom);
  const [playerGrid, setPlayerGrid] = useAtom(player_grid_atom);
  const [started, setStarted] = useAtom(started_atom);
  const [completed, setCompleted] = useAtom(completed_atom);
  const setSeconds = useSetAtom(seconds_atom);
  const setNonce = useSetAtom(game_session_nonce_atom);
  const [focus, setFocus] = useAtom(active_focus_atom);
  const setSolved = useSetAtom(solved_entry_ids_atom);
  const setIncorrect = useSetAtom(incorrect_entry_ids_atom);
  const setCelebrationFired = useSetAtom(celebration_fired_atom);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timerRef]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }, [clearTimer, setSeconds, timerRef]);

  const focusCell = useCallback(
    (row: number, col: number, options?: { direction?: CrossWordDirection; toggle?: boolean }) => {
      if (!puzzle) return;
      const template = puzzle.grid[row]?.[col];
      if (template === null || template === undefined) return;

      const covering = findEntriesAtCell(puzzle.entries, row, col);
      if (covering.length === 0) return;

      const current = store.get(active_focus_atom);
      let preferred = options?.direction;

      if (options?.toggle && current && current.row === row && current.col === col) {
        const other = covering.find((entry) => entry.direction !== current.direction);
        preferred = other?.direction ?? current.direction;
      }

      const entry = pickPreferredEntry(covering, preferred, current?.entryId);
      if (!entry) return;

      const nextFocus: ActiveFocus = {
        row,
        col,
        direction: entry.direction,
        entryId: entry.id
      };
      setFocus(nextFocus);
    },
    [puzzle, setFocus, store]
  );

  const startGame = useCallback(() => {
    if (!puzzle) return;
    setPlayerGrid(createEmptyPlayerGrid(puzzle.grid));
    setStarted(true);
    setCompleted(false);
    setSeconds(0);
    setSolved([]);
    setIncorrect([]);
    setCelebrationFired(false);
    setNonce((n) => n + 1);

    const first = entries[0];
    if (first) {
      setFocus({
        row: first.row,
        col: first.col,
        direction: first.direction,
        entryId: first.id
      });
    } else {
      setFocus(null);
    }

    startTimer();
  }, [
    entries,
    puzzle,
    setCelebrationFired,
    setCompleted,
    setFocus,
    setIncorrect,
    setNonce,
    setPlayerGrid,
    setSeconds,
    setSolved,
    setStarted,
    startTimer
  ]);

  const resetGame = useCallback(() => {
    if (!puzzle) return;
    clearTimer();
    setPlayerGrid(createEmptyPlayerGrid(puzzle.grid));
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setSolved([]);
    setIncorrect([]);
    setCelebrationFired(false);
    setFocus(null);
    setNonce((n) => n + 1);
  }, [
    clearTimer,
    puzzle,
    setCelebrationFired,
    setCompleted,
    setFocus,
    setIncorrect,
    setNonce,
    setPlayerGrid,
    setSeconds,
    setSolved,
    setStarted
  ]);

  const applyEvaluation = useCallback(
    (nextGrid: (string | null)[][]) => {
      if (!puzzle) return;
      const { solved, incorrect, allSolved } = evaluateEntries(entries, nextGrid, puzzle);
      setSolved(solved);
      setIncorrect(incorrect);

      if (allSolved) {
        setCompleted(true);
        clearTimer();
      }
    },
    [clearTimer, entries, puzzle, setCompleted, setIncorrect, setSolved]
  );

  const typeLetter = useCallback(
    (letter: string) => {
      if (!puzzle || !started || completed || !focus) return;
      const normalized = letter.toUpperCase();
      if (!/^[A-Z]$/.test(normalized)) return;

      const entry = entries.find((e) => e.id === focus.entryId);
      if (!entry) return;

      // If the focused cell is fixed, advance to the next editable cell first
      let targetRow = focus.row;
      let targetCol = focus.col;
      if (!isEditableCell(puzzle.grid[targetRow]![targetCol]!)) {
        let cursor = nextCellInEntry(entry, targetRow, targetCol, 1);
        while (cursor && !isEditableCell(puzzle.grid[cursor.row]![cursor.col]!)) {
          cursor = nextCellInEntry(entry, cursor.row, cursor.col, 1);
        }
        if (!cursor) return;
        targetRow = cursor.row;
        targetCol = cursor.col;
      }

      setPlayerGrid((prev) => {
        const copy = prev.map((row) => [...row]);
        copy[targetRow]![targetCol] = normalized;
        applyEvaluation(copy);
        return copy;
      });

      const next = nextCellInEntry(entry, targetRow, targetCol, 1);
      setFocus({
        ...focus,
        row: next?.row ?? targetRow,
        col: next?.col ?? targetCol
      });
    },
    [applyEvaluation, completed, entries, focus, puzzle, setFocus, setPlayerGrid, started]
  );

  const backspace = useCallback(() => {
    if (!puzzle || !started || completed || !focus) return;
    const template = puzzle.grid[focus.row]?.[focus.col];
    const currentValue = playerGrid[focus.row]?.[focus.col] ?? '';

    if (isEditableCell(template ?? null) && currentValue !== '') {
      setPlayerGrid((prev) => {
        const copy = prev.map((row) => [...row]);
        copy[focus.row]![focus.col] = '';
        applyEvaluation(copy);
        return copy;
      });
      return;
    }

    const entry = entries.find((e) => e.id === focus.entryId);
    if (!entry) return;
    const prevCell = nextCellInEntry(entry, focus.row, focus.col, -1);
    if (!prevCell) return;

    setFocus({ ...focus, row: prevCell.row, col: prevCell.col });

    if (isEditableCell(puzzle.grid[prevCell.row]![prevCell.col]!)) {
      setPlayerGrid((prev) => {
        const copy = prev.map((row) => [...row]);
        copy[prevCell.row]![prevCell.col] = '';
        applyEvaluation(copy);
        return copy;
      });
    }
  }, [
    applyEvaluation,
    completed,
    entries,
    focus,
    playerGrid,
    puzzle,
    setFocus,
    setPlayerGrid,
    started
  ]);

  const moveWithArrow = useCallback(
    (key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
      if (!puzzle || !started || completed || !focus) return;

      const delta =
        key === 'ArrowUp'
          ? { dRow: -1, dCol: 0, direction: 'down' as const }
          : key === 'ArrowDown'
            ? { dRow: 1, dCol: 0, direction: 'down' as const }
            : key === 'ArrowLeft'
              ? { dRow: 0, dCol: -1, direction: 'across' as const }
              : { dRow: 0, dCol: 1, direction: 'across' as const };

      const next = nextPlayableCell(puzzle.grid, focus.row, focus.col, delta.dRow, delta.dCol);
      if (!next) return;
      focusCell(next.row, next.col, { direction: delta.direction });
    },
    [completed, focus, focusCell, puzzle, started]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!started || completed) return;

      if (event.key === 'Tab') {
        event.preventDefault();
        if (!focus || entries.length === 0) return;
        const index = entries.findIndex((e) => e.id === focus.entryId);
        const dir = event.shiftKey ? -1 : 1;
        const nextEntry = entries[(index + dir + entries.length) % entries.length]!;
        setFocus({
          row: nextEntry.row,
          col: nextEntry.col,
          direction: nextEntry.direction,
          entryId: nextEntry.id
        });
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (focus) focusCell(focus.row, focus.col, { toggle: true });
        return;
      }

      if (
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight'
      ) {
        event.preventDefault();
        moveWithArrow(event.key);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        backspace();
        return;
      }

      if (
        event.key.length === 1 &&
        /[a-zA-Z]/.test(event.key) &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        typeLetter(event.key);
      }
    },
    [backspace, completed, entries, focus, focusCell, moveWithArrow, setFocus, started, typeLetter]
  );

  const isCellInActiveWord = useCallback(
    (row: number, col: number) => {
      if (!focus) return false;
      const entry = entries.find((e) => e.id === focus.entryId);
      if (!entry) return false;
      return getEntryCells(entry).some((cell) => cell.row === row && cell.col === col);
    },
    [entries, focus]
  );

  const isCellSolved = useCallback(
    (row: number, col: number) => {
      const solvedIds = store.get(solved_entry_ids_atom);
      return entries.some(
        (entry) =>
          solvedIds.includes(entry.id) &&
          getEntryCells(entry).some((cell) => cell.row === row && cell.col === col)
      );
    },
    [entries, store]
  );

  const getDisplayLetter = useCallback(
    (row: number, col: number) => {
      if (!puzzle) return '';
      const template = puzzle.grid[row]![col]!;
      if (template === null) return '';
      if (isFixedCell(template)) return template;
      return playerGrid[row]?.[col] ?? '';
    },
    [playerGrid, puzzle]
  );

  return {
    puzzle,
    entries,
    playerGrid,
    started,
    completed,
    focus,
    startGame,
    resetGame,
    focusCell,
    handleKeyDown,
    typeLetter,
    backspace,
    isCellInActiveWord,
    isCellSolved,
    getDisplayLetter,
    clearTimer
  };
}
