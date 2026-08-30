'use client';

import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import {
  active_focus_atom,
  celebration_fired_atom,
  clearing_cells_atom,
  completed_atom,
  game_session_nonce_atom,
  incorrect_entry_attempts_atom,
  incorrect_entry_ids_atom,
  letter_inputs_atom,
  numbered_entries_atom,
  player_grid_atom,
  puzzle_atom,
  revealing_cells_atom,
  revealing_entry_id_atom,
  reveals_used_atom,
  seconds_atom,
  solved_entry_ids_atom,
  started_atom
} from './game_state';
import {
  cellKey,
  createEmptyPlayerGrid,
  findEntriesAtCell,
  getCellLetter,
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

/** Delay before the first clear/reveal step so focus can settle. */
const REVEAL_START_DELAY_MS = 120;
/** Gap between clearing each trailing incorrect letter (end → start). */
const REVEAL_CLEAR_STEP_MS = 130;
/** Pause after the last clear before writing the revealed letter. */
const REVEAL_AFTER_CLEAR_MS = 80;
const REVEAL_FLASH_CLEAR_MS = 600;

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

/** True when any solved entry passes through this cell (the cell is locked). */
function isEntrySolvedAt(entries: NumberedEntry[], solvedIds: string[], row: number, col: number) {
  return findEntriesAtCell(entries, row, col).some((e) => solvedIds.includes(e.id));
}

/**
 * A cell that accepts input: editable template, (when `playerGrid` is given)
 * no letter yet, and not part of a solved entry.
 */
function isCellEnterable(
  grid: CrossWordGamePuzzle['grid'],
  playerGrid: (string | null)[][] | null,
  entries: NumberedEntry[],
  solvedIds: string[],
  row: number,
  col: number
) {
  if (!isEditableCell(grid[row]?.[col] ?? null)) return false;
  if (playerGrid && (playerGrid[row]?.[col] ?? '') !== '') return false;
  return !isEntrySolvedAt(entries, solvedIds, row, col);
}

/**
 * Advance from (startRow, startCol) to the first enterable cell in the entry.
 * Returns null when the whole remaining entry is locked.
 */
function advanceToEnterableCell(
  entry: CrossWordEntry,
  grid: CrossWordGamePuzzle['grid'],
  playerGrid: (string | null)[][] | null,
  entries: NumberedEntry[],
  solvedIds: string[],
  startRow: number,
  startCol: number
) {
  if (isCellEnterable(grid, playerGrid, entries, solvedIds, startRow, startCol)) {
    return { row: startRow, col: startCol };
  }
  let cursor = nextCellInEntry(entry, startRow, startCol, 1);
  while (cursor && !isCellEnterable(grid, playerGrid, entries, solvedIds, cursor.row, cursor.col)) {
    cursor = nextCellInEntry(entry, cursor.row, cursor.col, 1);
  }
  return cursor;
}

/** Write an empty string into one grid cell and push the updated grid. */
function clearCellLetter(
  grid: (string | null)[][],
  row: number,
  col: number,
  setPlayerGrid: (grid: (string | null)[][]) => void,
  applyEvaluation: (grid: (string | null)[][]) => void
) {
  const nextGrid = grid.map((r) => [...r]);
  nextGrid[row]![col] = '';
  setPlayerGrid(nextGrid);
  applyEvaluation(nextGrid);
}

/**
 * Clear the letter at a cell when it is editable, actually filled, and not
 * part of a solved entry. Returns true when the cell was cleared.
 */
function clearEditableUnlockedCell(
  grid: (string | null)[][],
  template: string | null | undefined,
  row: number,
  col: number,
  isSolved: boolean,
  setPlayerGrid: (grid: (string | null)[][]) => void,
  applyEvaluation: (grid: (string | null)[][]) => void
) {
  if (!isEditableCell(template ?? null)) return false;
  if ((grid[row]?.[col] ?? '') === '') return false;
  if (isSolved) return false;
  clearCellLetter(grid, row, col, setPlayerGrid, applyEvaluation);
  return true;
}

/** Step back from (row, col) past fixed (prefilled) cells. Returns null at entry start. */
function previousUnfixedCell(
  entry: CrossWordEntry,
  grid: CrossWordGamePuzzle['grid'],
  row: number,
  col: number
) {
  let prevCell = nextCellInEntry(entry, row, col, -1);
  while (prevCell && isFixedCell(grid[prevCell.row]![prevCell.col]!)) {
    prevCell = nextCellInEntry(entry, prevCell.row, prevCell.col, -1);
  }
  return prevCell;
}

/** Decide whether a tap should toggle the axis (double-tap / Space heuristics). */
function isToggleAction(
  options: { direction?: CrossWordDirection; toggle?: boolean } | undefined,
  current: { row: number; col: number } | null,
  row: number,
  col: number,
  clickedIsWritable: boolean,
  currentEntryCoversClick: boolean
) {
  return !!(
    options?.toggle ||
    (current &&
      !options?.direction &&
      clickedIsWritable &&
      current.row === row &&
      current.col === col) ||
    (current && !options?.direction && !clickedIsWritable && currentEntryCoversClick)
  );
}

/**
 * Resolve the preferred direction and entry ordering for a focus change.
 * Toggles switch the axis; fresh taps at non-writable intersections prefer
 * the shorter word first.
 */
function resolveFocusDirection(
  options: { direction?: CrossWordDirection; toggle?: boolean } | undefined,
  current: { direction: CrossWordDirection; entryId: string } | null,
  covering: CrossWordEntry[],
  isToggle: boolean,
  clickedIsWritable: boolean
) {
  let preferred = options?.direction;

  if (isToggle && current) {
    const other = covering.find((entry) => entry.direction !== current.direction);
    preferred = other?.direction ?? current.direction;
    return { preferred, orderedCovering: covering };
  }

  if (!options?.direction && covering.length > 1 && !clickedIsWritable) {
    const ordered = [...covering].toSorted((a, b) => a.answer.length - b.answer.length);
    return { preferred: ordered[0]!.direction, orderedCovering: ordered };
  }

  return { preferred, orderedCovering: covering };
}

/** Count fully-filled, incorrect entries among the given entries. */
function countFilledIncorrectEntries(
  candidates: CrossWordEntry[],
  nextGrid: (string | null)[][],
  grid: CrossWordGamePuzzle['grid']
) {
  let delta = 0;
  for (const entry of candidates) {
    if (isEntryFilled(entry, nextGrid, grid) && !isEntryCorrect(entry, nextGrid, grid)) {
      delta += 1;
    }
  }
  return delta;
}

/** Advance past solved/fixed cells so the next typed letter lands on an input target. */
function nextTypingTarget(
  entry: CrossWordEntry,
  grid: CrossWordGamePuzzle['grid'],
  entries: NumberedEntry[],
  solvedIds: string[],
  fromRow: number,
  fromCol: number
) {
  let next = nextCellInEntry(entry, fromRow, fromCol, 1);
  while (next) {
    const followingCell = nextCellInEntry(entry, next.row, next.col, 1);
    const nextIsFixed = isFixedCell(grid[next.row]![next.col]!);

    if (!isEntrySolvedAt(entries, solvedIds, next.row, next.col) && (!nextIsFixed || !followingCell)) {
      break;
    }

    next = followingCell;
  }
  return next;
}

function arrowKeyDelta(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
  switch (key) {
    case 'ArrowUp':
      return { dRow: -1, dCol: 0, direction: 'down' as const };
    case 'ArrowDown':
      return { dRow: 1, dCol: 0, direction: 'down' as const };
    case 'ArrowLeft':
      return { dRow: 0, dCol: -1, direction: 'across' as const };
    default:
      return { dRow: 0, dCol: 1, direction: 'across' as const };
  }
}

function isArrowEventKey(key: string): key is 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}

function isLetterEventKey(event: KeyboardEvent) {
  return (
    event.key.length === 1 && /[a-zA-Z]/.test(event.key) && !event.ctrlKey && !event.metaKey
  );
}

/** Longest contiguous correct prefix length from the start of the entry. */
function longestCorrectPrefixLength(
  cells: { row: number; col: number }[],
  currentGrid: (string | null)[][],
  grid: CrossWordGamePuzzle['grid'],
  answer: string
) {
  let prefixLen = 0;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const letter = getCellLetter(currentGrid, grid, cell.row, cell.col).toUpperCase();
    if (letter === answer[i]) {
      prefixLen += 1;
    } else {
      break;
    }
  }
  return prefixLen;
}

/** Trailing incorrect letters to erase (right→left), skipping protected cells. */
function collectTrailingClears(
  cells: { row: number; col: number }[],
  currentGrid: (string | null)[][],
  answer: string,
  prefixLen: number,
  isProtectedCell: (row: number, col: number) => boolean
) {
  const clears: { row: number; col: number }[] = [];
  for (let i = cells.length - 1; i >= prefixLen; i--) {
    const cell = cells[i]!;
    if (isProtectedCell(cell.row, cell.col)) continue;
    const current = (currentGrid[cell.row]?.[cell.col] ?? '').toUpperCase();
    if (current === '' || current === answer[i]) continue;
    clears.push({ row: cell.row, col: cell.col });
  }
  return clears;
}

/** First enterable cell after the revealed letter (editable, unsolved, empty). */
function nextEnterableCellAfterReveal(
  entry: CrossWordEntry,
  grid: CrossWordGamePuzzle['grid'],
  entries: NumberedEntry[],
  solvedIds: string[],
  nextGrid: (string | null)[][],
  fromRow: number,
  fromCol: number
) {
  const isEnterable = (row: number, col: number) => {
    if (!isEditableCell(grid[row]![col]!)) return false;
    if (isEntrySolvedAt(entries, solvedIds, row, col)) return false;
    return (nextGrid[row]?.[col] ?? '') === '';
  };

  let next = nextCellInEntry(entry, fromRow, fromCol, 1);
  while (next && !isEnterable(next.row, next.col)) {
    next = nextCellInEntry(entry, next.row, next.col, 1);
  }
  return next;
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
  const [revealsUsed, setRevealsUsed] = useAtom(reveals_used_atom);
  const [revealingEntryId, setRevealingEntryId] = useAtom(revealing_entry_id_atom);
  const setRevealingCells = useSetAtom(revealing_cells_atom);
  const setClearingCells = useSetAtom(clearing_cells_atom);
  const revealTimersRef = useRef<number[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [timerRef]);

  const clearRevealTimers = useCallback(() => {
    for (const id of revealTimersRef.current) {
      window.clearTimeout(id);
    }
    revealTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      clearRevealTimers();
    };
  }, [clearTimer, clearRevealTimers]);

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
      if (store.get(revealing_entry_id_atom)) return;
      const template = puzzle.grid[row]?.[col];
      if (template === null || template === undefined) return;

      const covering = findEntriesAtCell(puzzle.entries, row, col);
      if (covering.length === 0) return;

      const current = store.get(active_focus_atom);
      const pg = store.get(player_grid_atom);
      const sids = store.get(solved_entry_ids_atom);

      const clickedIsWritable = isCellEnterable(puzzle.grid, pg, entries, sids, row, col);
      const currentEntryCoversClick = !!current && covering.some((e) => e.id === current.entryId);

      // Toggle: explicit option, re-tap of a writable cell, or re-tap of the
      // active entry's non-writable cell.
      const isToggle = isToggleAction(
        options,
        current,
        row,
        col,
        clickedIsWritable,
        currentEntryCoversClick
      );

      const { preferred, orderedCovering } = resolveFocusDirection(
        options,
        current,
        covering,
        isToggle,
        clickedIsWritable
      );

      const entry = pickPreferredEntry(orderedCovering, preferred, current?.entryId);
      if (!entry) return;

      // Advance cursor to first writable cell starting from the tapped position.
      // cursor === null → whole word filled → stay on tapped cell (review mode).
      const cursor = advanceToEnterableCell(
        entry,
        puzzle.grid,
        pg,
        entries,
        sids,
        row,
        col
      );
      const cursorRow = cursor?.row ?? row;
      const cursorCol = cursor?.col ?? col;

      setFocus({ row: cursorRow, col: cursorCol, direction: entry.direction, entryId: entry.id });
    },
    [entries, puzzle, setFocus, store]
  );

  const startGame = useCallback(() => {
    if (!puzzle) return;
    clearRevealTimers();
    setPlayerGrid(createEmptyPlayerGrid(puzzle.grid));
    setStarted(true);
    setCompleted(false);
    setSeconds(0);
    setSolved([]);
    setIncorrect([]);
    setCelebrationFired(false);
    setLetterInputs(0);
    setIncorrectAttempts(0);
    setRevealsUsed(0);
    setRevealingEntryId(null);
    setRevealingCells([]);
    setClearingCells([]);
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
    clearRevealTimers,
    entries,
    puzzle,
    setCelebrationFired,
    setClearingCells,
    setCompleted,
    setFocus,
    setIncorrect,
    setIncorrectAttempts,
    setLetterInputs,
    setNonce,
    setPlayerGrid,
    setRevealingCells,
    setRevealingEntryId,
    setRevealsUsed,
    setSeconds,
    setSolved,
    setStarted,
    startTimer
  ]);

  const resetGame = useCallback(() => {
    if (!puzzle) return;
    clearTimer();
    clearRevealTimers();
    setPlayerGrid(createEmptyPlayerGrid(puzzle.grid));
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setSolved([]);
    setIncorrect([]);
    setCelebrationFired(false);
    setLetterInputs(0);
    setIncorrectAttempts(0);
    setRevealsUsed(0);
    setRevealingEntryId(null);
    setRevealingCells([]);
    setClearingCells([]);
    setFocus(null);
    setNonce((n) => n + 1);
  }, [
    clearRevealTimers,
    clearTimer,
    puzzle,
    setCelebrationFired,
    setClearingCells,
    setCompleted,
    setFocus,
    setIncorrect,
    setIncorrectAttempts,
    setLetterInputs,
    setNonce,
    setPlayerGrid,
    setRevealingCells,
    setRevealingEntryId,
    setRevealsUsed,
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
      const currentFocus = store.get(active_focus_atom);
      if (!puzzle || !started || completed || !currentFocus) return;
      if (store.get(revealing_entry_id_atom)) return;
      const normalized = letter.toUpperCase();
      if (!/^[A-Z]$/.test(normalized)) return;

      const entry = entries.find((e) => e.id === currentFocus.entryId);
      if (!entry) return;

      const solvedIds = store.get(solved_entry_ids_atom);

      // Advance from the current focus to the first writable cell in the entry.
      const target = advanceToEnterableCell(
        entry,
        puzzle.grid,
        null,
        entries,
        solvedIds,
        currentFocus.row,
        currentFocus.col
      );
      if (!target) return; // whole entry is already solved/fixed — nothing to type
      const targetRow = target.row;
      const targetCol = target.col;

      setLetterInputs((n) => n + 1);

      const prevGrid = store.get(player_grid_atom);
      const nextGrid = prevGrid.map((row) => [...row]);
      nextGrid[targetRow]![targetCol] = normalized;

      // Count incorrect full-entry evaluations for entries covering this cell.
      const affected = findEntriesAtCell(entries, targetRow, targetCol);
      const incorrectDelta = countFilledIncorrectEntries(affected, nextGrid, puzzle.grid);
      if (incorrectDelta > 0) {
        setIncorrectAttempts((n) => n + incorrectDelta);
      }

      setPlayerGrid(nextGrid);
      applyEvaluation(nextGrid);

      // Advance the cursor, skipping over solved cells. A fixed letter in the
      // middle of an entry is not an input target, so move past it to show
      // where the next typed letter will land. Keep a fixed final cell as the
      // cursor destination to preserve the existing end-of-word behavior.
      const next = nextTypingTarget(
        entry,
        puzzle.grid,
        entries,
        solvedIds,
        targetRow,
        targetCol
      );
      setFocus({
        ...currentFocus,
        row: next?.row ?? targetRow,
        col: next?.col ?? targetCol
      });
    },
    [
      applyEvaluation,
      completed,
      entries,
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
    const currentFocus = store.get(active_focus_atom);
    if (!puzzle || !started || completed || !currentFocus) return;
    if (store.get(revealing_entry_id_atom)) return;
    const template = puzzle.grid[currentFocus.row]?.[currentFocus.col];
    const currentGrid = store.get(player_grid_atom);
    const solvedIds = store.get(solved_entry_ids_atom);
    const isCurrentCellSolved = isEntrySolvedAt(entries, solvedIds, currentFocus.row, currentFocus.col);

    // Solved entry cells are locked exactly like prefilled hint cells: they
    // remain visible but cannot be erased, even where entries intersect.
    if (
      clearEditableUnlockedCell(
        currentGrid,
        template,
        currentFocus.row,
        currentFocus.col,
        isCurrentCellSolved,
        setPlayerGrid,
        applyEvaluation
      )
    ) {
      return;
    }

    const entry = entries.find((e) => e.id === currentFocus.entryId);
    if (!entry) return;

    // Step back past prefilled hints so backspace isn't blocked mid-word.
    const prevCell = previousUnfixedCell(entry, puzzle.grid, currentFocus.row, currentFocus.col);
    if (!prevCell) return;

    setFocus({ ...currentFocus, row: prevCell.row, col: prevCell.col });

    if (isCellEnterable(puzzle.grid, null, entries, solvedIds, prevCell.row, prevCell.col)) {
      clearCellLetter(currentGrid, prevCell.row, prevCell.col, setPlayerGrid, applyEvaluation);
    }
  }, [applyEvaluation, completed, entries, puzzle, setFocus, setPlayerGrid, started, store]);

  const moveWithArrow = useCallback(
    (key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
      const currentFocus = store.get(active_focus_atom);
      if (!puzzle || !started || completed || !currentFocus) return;

      const delta = arrowKeyDelta(key);

      const next = nextPlayableCell(
        puzzle.grid,
        currentFocus.row,
        currentFocus.col,
        delta.dRow,
        delta.dCol
      );
      if (!next) return;
      focusCell(next.row, next.col, { direction: delta.direction });
    },
    [completed, focusCell, puzzle, started, store]
  );

  const moveToAdjacentEntry = useCallback(
    (dir: -1 | 1) => {
      if (!focus || entries.length === 0 || !puzzle) return;
      const index = entries.findIndex((e) => e.id === focus.entryId);
      const nextEntry = entries[(index + dir + entries.length) % entries.length]!;
      // Prefer the first writable cell so Tab isn't stranded on a prefilled start.
      const firstWritable = getEntryCells(nextEntry).find(({ row, col }) =>
        isEditableCell(puzzle.grid[row]?.[col] ?? null)
      );
      setFocus({
        row: firstWritable?.row ?? nextEntry.row,
        col: firstWritable?.col ?? nextEntry.col,
        direction: nextEntry.direction,
        entryId: nextEntry.id
      });
    },
    [entries, focus, puzzle, setFocus]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!started || completed) return;
      if (store.get(revealing_entry_id_atom)) return;

      if (event.key === 'Tab') {
        event.preventDefault();
        moveToAdjacentEntry(event.shiftKey ? -1 : 1);
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (focus) focusCell(focus.row, focus.col, { toggle: true });
        return;
      }

      if (isArrowEventKey(event.key)) {
        event.preventDefault();
        moveWithArrow(event.key);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        backspace();
        return;
      }

      if (isLetterEventKey(event)) {
        event.preventDefault();
        typeLetter(event.key);
      }
    },
    [
      backspace,
      completed,
      focus,
      focusCell,
      moveWithArrow,
      moveToAdjacentEntry,
      started,
      store,
      typeLetter
    ]
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
    if (store.get(revealing_entry_id_atom)) return;
    setFocus(null);
  }, [setFocus, store]);

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
    if (store.get(revealing_entry_id_atom)) return;
    focusCell(focus.row, focus.col, { toggle: true });
  }, [canToggleDirection, focus, focusCell, store]);

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

  /**
   * Reveal one letter of the selected word (unlimited).
   * Finds the longest correct prefix, clears trailing incorrect letters (end→start,
   * never touching prefilled or green/solved cells), then fills the next letter.
   */
  const revealEntry = useCallback(
    (entryId: string) => {
      if (!puzzle || !started || completed) return;
      if (store.get(revealing_entry_id_atom)) return;

      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      if (store.get(solved_entry_ids_atom).includes(entryId)) return;

      const currentGrid = store.get(player_grid_atom);
      const cells = getEntryCells(entry);
      const answer = entry.answer.toUpperCase();
      const solvedIds = store.get(solved_entry_ids_atom);

      const isProtectedCell = (row: number, col: number) =>
        isFixedCell(puzzle.grid[row]?.[col] ?? null) ||
        isEntrySolvedAt(entries, solvedIds, row, col);

      const prefixLen = longestCorrectPrefixLength(cells, currentGrid, puzzle.grid, answer);

      if (prefixLen >= answer.length) return;

      // Trailing incorrect letters to erase (right→left), skipping protected cells.
      const clears = collectTrailingClears(cells, currentGrid, answer, prefixLen, isProtectedCell);

      const revealCell = cells[prefixLen]!;
      const revealLetter = answer[prefixLen]!;
      // Protected empty targets shouldn't happen (fixed/solved always have letters).
      if (isProtectedCell(revealCell.row, revealCell.col)) return;

      clearRevealTimers();
      setRevealsUsed((n) => n + 1);
      setRevealingEntryId(entryId);
      setRevealingCells([]);
      setClearingCells([]);

      const focusOn = (row: number, col: number) => {
        setFocus({
          row,
          col,
          direction: entry.direction,
          entryId: entry.id
        });
      };

      const firstAction = clears[0] ?? revealCell;
      focusOn(firstAction.row, firstAction.col);

      clears.forEach((clear, index) => {
        const timerId = window.setTimeout(
          () => {
            focusOn(clear.row, clear.col);
            setClearingCells([cellKey(clear.row, clear.col)]);

            const prevGrid = store.get(player_grid_atom);
            const nextGrid = prevGrid.map((row) => [...row]);
            nextGrid[clear.row]![clear.col] = '';
            setPlayerGrid(nextGrid);

            const clearFlashId = window.setTimeout(() => {
              setClearingCells((prev) => prev.filter((k) => k !== cellKey(clear.row, clear.col)));
            }, REVEAL_CLEAR_STEP_MS);
            revealTimersRef.current.push(clearFlashId);
          },
          REVEAL_START_DELAY_MS + index * REVEAL_CLEAR_STEP_MS
        );
        revealTimersRef.current.push(timerId);
      });

      const writeDelay =
        REVEAL_START_DELAY_MS +
        clears.length * REVEAL_CLEAR_STEP_MS +
        (clears.length > 0 ? REVEAL_AFTER_CLEAR_MS : 0);

      const writeId = window.setTimeout(() => {
        setClearingCells([]);

        const prevGrid = store.get(player_grid_atom);
        const nextGrid = prevGrid.map((row) => [...row]);
        nextGrid[revealCell.row]![revealCell.col] = revealLetter;
        setPlayerGrid(nextGrid);
        setRevealingCells([cellKey(revealCell.row, revealCell.col)]);
        applyEvaluation(nextGrid);
        setRevealingEntryId(null);

        // Advance past the revealed letter so the next keystroke lands on the
        // following enterable cell instead of overwriting what we just filled.
        const freshSolved = store.get(solved_entry_ids_atom);
        const next = nextEnterableCellAfterReveal(
          entry,
          puzzle.grid,
          entries,
          freshSolved,
          nextGrid,
          revealCell.row,
          revealCell.col
        );
        focusOn(next?.row ?? revealCell.row, next?.col ?? revealCell.col);

        const clearId = window.setTimeout(() => {
          setRevealingCells([]);
        }, REVEAL_FLASH_CLEAR_MS);
        revealTimersRef.current.push(clearId);
      }, writeDelay);
      revealTimersRef.current.push(writeId);
    },
    [
      applyEvaluation,
      clearRevealTimers,
      completed,
      entries,
      puzzle,
      setClearingCells,
      setFocus,
      setPlayerGrid,
      setRevealingCells,
      setRevealingEntryId,
      setRevealsUsed,
      started,
      store
    ]
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
    clearFocus,
    revealEntry,
    revealingEntryId,
    revealsUsed
  };
}
