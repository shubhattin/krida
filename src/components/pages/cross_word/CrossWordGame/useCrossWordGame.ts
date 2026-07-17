'use client';

import { type RefObject, useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import {
  active_focus_atom,
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
  started_atom
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
  const setLetterInputs = useSetAtom(letter_inputs_atom);
  const setIncorrectAttempts = useSetAtom(incorrect_entry_attempts_atom);

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

  /**
   * CELL SELECTION ALGORITHM
   *
   * 1. Direction is resolved with the existing toggle heuristic (double-tap same cell → switch axis).
   * 2. After picking the entry, the cursor is placed on the FIRST WRITABLE cell at or after the
   *    tapped position in the entry's direction.
   *    "Writable" = editable template  +  no letter in playerGrid  +  not part of a solved entry.
   * 3. If the tapped cell itself is writable the cursor lands there (normal case).
   * 4. If the tapped cell already has text we advance forward, skipping filled/solved cells,
   *    so the cursor ring only ever marks the cell that actually accepts keyboard input.
   * 5. If every remaining cell is filled (whole word done) the cursor stays on the tapped cell
   *    so the user can still see the word highlight (review mode).
   * 6. INTERSECTION EDGE CASE: if a non-writable cell sits at the axis of two entries (e.g. "A"
   *    shared by ASANA across and ADI down), a fresh tap prefers the SHORTER word first.
   *    A second tap on the same cell toggles to the longer word via the usual direction-switch.
   */
  const focusCell = useCallback(
    (row: number, col: number, options?: { direction?: CrossWordDirection; toggle?: boolean }) => {
      if (!puzzle) return;
      const template = puzzle.grid[row]?.[col];
      if (template === null || template === undefined) return;

      const covering = findEntriesAtCell(puzzle.entries, row, col);
      if (covering.length === 0) return;

      const current = store.get(active_focus_atom);

      // Helper to check if the clicked cell is writable
      const pg = store.get(player_grid_atom);
      const sids = store.get(solved_entry_ids_atom);
      const clickedIsWritable =
        isEditableCell(puzzle.grid[row]?.[col] ?? null) &&
        (pg[row]?.[col] ?? '') === '' &&
        !findEntriesAtCell(entries, row, col).some((e) => sids.includes(e.id));

      const isCurrentEntryCoveringClick = current && covering.some((e) => e.id === current.entryId);

      // Determine if this is a toggle action:
      // 1. Explicit toggle option is passed.
      // 2. Or, the clicked cell is writable, no explicit direction is requested, and the cursor is already on it.
      // 3. Or, the clicked cell is NOT writable, no explicit direction is requested, and it is part of the currently active entry.
      const isToggle = !!(
        options?.toggle ||
        (current &&
          !options?.direction &&
          clickedIsWritable &&
          current.row === row &&
          current.col === col) ||
        (current && !options?.direction && !clickedIsWritable && isCurrentEntryCoveringClick)
      );

      let preferred = options?.direction;

      // Toggle: switch axis (ACROSS ↔ DOWN)
      if (isToggle && current) {
        const other = covering.find((entry) => entry.direction !== current.direction);
        preferred = other?.direction ?? current.direction;
      }

      // Intersection edge case for fresh clicks (non-toggles, no explicit direction):
      // Prefer the shorter word first at non-writable intersections.
      let orderedCovering = covering;
      if (!isToggle && !options?.direction && covering.length > 1) {
        if (!clickedIsWritable) {
          orderedCovering = [...covering].sort((a, b) => a.answer.length - b.answer.length);
          preferred = orderedCovering[0]!.direction;
        }
      }

      const entry = pickPreferredEntry(orderedCovering, preferred, current?.entryId);
      if (!entry) return;

      // Snapshot mutable state once (avoids stale closure issues).
      const currentPlayerGrid = store.get(player_grid_atom);
      const solvedIds = store.get(solved_entry_ids_atom);

      // A cell is writable if its template is editable, it holds no letter, and it is not
      // part of an already-solved entry.
      const isCellWritable = (r: number, c: number): boolean => {
        if (!isEditableCell(puzzle.grid[r]?.[c] ?? null)) return false;
        if ((currentPlayerGrid[r]?.[c] ?? '') !== '') return false;
        return !findEntriesAtCell(entries, r, c).some((e) => solvedIds.includes(e.id));
      };

      // Advance cursor to first writable cell starting from the tapped position.
      let cursorRow = row;
      let cursorCol = col;
      if (!isCellWritable(row, col)) {
        let cursor = nextCellInEntry(entry, row, col, 1);
        while (cursor && !isCellWritable(cursor.row, cursor.col)) {
          cursor = nextCellInEntry(entry, cursor.row, cursor.col, 1);
        }
        if (cursor) {
          cursorRow = cursor.row;
          cursorCol = cursor.col;
        }
        // cursor === null → whole word filled → stay on tapped cell (review mode)
      }

      setFocus({ row: cursorRow, col: cursorCol, direction: entry.direction, entryId: entry.id });
    },
    [entries, puzzle, setFocus, store]
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
    setLetterInputs(0);
    setIncorrectAttempts(0);
    setNonce((n) => n + 1);

    const first = entries[0];
    if (first) {
      // The entry can begin with a prefilled hint. Start on its first writable
      // cell so the selection always communicates where the first typed letter
      // will be placed, just as selecting that fixed cell does during play.
      const firstWritableCell = getEntryCells(first).find(({ row, col }) =>
        isEditableCell(puzzle.grid[row]?.[col] ?? null)
      );
      setFocus({
        row: firstWritableCell?.row ?? first.row,
        col: firstWritableCell?.col ?? first.col,
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
    setIncorrectAttempts,
    setLetterInputs,
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
    setLetterInputs(0);
    setIncorrectAttempts(0);
    setFocus(null);
    setNonce((n) => n + 1);
  }, [
    clearTimer,
    puzzle,
    setCelebrationFired,
    setCompleted,
    setFocus,
    setIncorrect,
    setIncorrectAttempts,
    setLetterInputs,
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

      // Helper: is a cell part of a solved entry (read-only at runtime)?
      const solvedIds = store.get(solved_entry_ids_atom);
      const isCellSolvedNow = (row: number, col: number) =>
        findEntriesAtCell(entries, row, col).some((e) => solvedIds.includes(e.id));

      // Helper: is this cell writable — editable template AND not already solved
      const isWritable = (row: number, col: number) =>
        isEditableCell(puzzle.grid[row]![col]!) && !isCellSolvedNow(row, col);

      // Advance from the current focus to the first writable cell in the entry
      let targetRow = focus.row;
      let targetCol = focus.col;
      if (!isWritable(targetRow, targetCol)) {
        let cursor = nextCellInEntry(entry, targetRow, targetCol, 1);
        while (cursor && !isWritable(cursor.row, cursor.col)) {
          cursor = nextCellInEntry(entry, cursor.row, cursor.col, 1);
        }
        if (!cursor) return; // whole entry is already solved/fixed — nothing to type
        targetRow = cursor.row;
        targetCol = cursor.col;
      }

      setLetterInputs((n) => n + 1);

      const prevGrid = store.get(player_grid_atom);
      const nextGrid = prevGrid.map((row) => [...row]);
      nextGrid[targetRow]![targetCol] = normalized;

      // Count incorrect full-entry evaluations for entries covering this cell.
      const affected = findEntriesAtCell(entries, targetRow, targetCol);
      let incorrectDelta = 0;
      for (const affectedEntry of affected) {
        if (
          isEntryFilled(affectedEntry, nextGrid, puzzle.grid) &&
          !isEntryCorrect(affectedEntry, nextGrid, puzzle.grid)
        ) {
          incorrectDelta += 1;
        }
      }
      if (incorrectDelta > 0) {
        setIncorrectAttempts((n) => n + incorrectDelta);
      }

      setPlayerGrid(nextGrid);
      applyEvaluation(nextGrid);

      // Advance the cursor, skipping over solved cells. A fixed letter in the
      // middle of an entry is not an input target, so move past it to show
      // where the next typed letter will land. Keep a fixed final cell as the
      // cursor destination to preserve the existing end-of-word behavior.
      let next = nextCellInEntry(entry, targetRow, targetCol, 1);
      while (next) {
        const followingCell = nextCellInEntry(entry, next.row, next.col, 1);
        const nextIsFixed = isFixedCell(puzzle.grid[next.row]![next.col]!);

        if (!isCellSolvedNow(next.row, next.col) && (!nextIsFixed || !followingCell)) {
          break;
        }

        next = followingCell;
      }
      setFocus({
        ...focus,
        row: next?.row ?? targetRow,
        col: next?.col ?? targetCol
      });
    },
    [
      applyEvaluation,
      completed,
      entries,
      focus,
      puzzle,
      setFocus,
      setIncorrectAttempts,
      setLetterInputs,
      setPlayerGrid,
      started,
      store
    ]
  );

  const backspace = useCallback(() => {
    if (!puzzle || !started || completed || !focus) return;
    const template = puzzle.grid[focus.row]?.[focus.col];
    const currentValue = playerGrid[focus.row]?.[focus.col] ?? '';
    const solvedIds = store.get(solved_entry_ids_atom);
    const isCellSolvedNow = (row: number, col: number) =>
      findEntriesAtCell(entries, row, col).some((entry) => solvedIds.includes(entry.id));

    // Solved entry cells are locked exactly like prefilled hint cells: they
    // remain visible but cannot be erased, even where entries intersect.
    if (
      isEditableCell(template ?? null) &&
      currentValue !== '' &&
      !isCellSolvedNow(focus.row, focus.col)
    ) {
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

    if (
      isEditableCell(puzzle.grid[prevCell.row]![prevCell.col]!) &&
      !isCellSolvedNow(prevCell.row, prevCell.col)
    ) {
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
    started,
    store
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

  const clearFocus = useCallback(() => {
    setFocus(null);
  }, [setFocus]);

  /**
   * True when the focused cell sits at an Across ∩ Down intersection,
   * so the on-screen path-switch control (and Space / re-tap) can flip axes.
   */
  const canToggleDirection = !!(
    focus &&
    puzzle &&
    findEntriesAtCell(puzzle.entries, focus.row, focus.col).length > 1
  );

  /** Flip Across ↔ Down at the current intersection (same as re-tapping / Space). */
  const toggleDirection = useCallback(() => {
    if (!focus || !canToggleDirection) return;
    focusCell(focus.row, focus.col, { toggle: true });
  }, [canToggleDirection, focus, focusCell]);

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
    canToggleDirection,
    toggleDirection,
    isCellInActiveWord,
    isCellSolved,
    getDisplayLetter,
    clearTimer,
    clearFocus
  };
}
