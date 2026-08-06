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

      // Helper: is a cell part of a solved entry (read-only at runtime)?
      const solvedIds = store.get(solved_entry_ids_atom);
      const isCellSolvedNow = (row: number, col: number) =>
        findEntriesAtCell(entries, row, col).some((e) => solvedIds.includes(e.id));

      // Helper: is this cell writable — editable template AND not already solved
      const isWritable = (row: number, col: number) =>
        isEditableCell(puzzle.grid[row]![col]!) && !isCellSolvedNow(row, col);

      // Advance from the current focus to the first writable cell in the entry
      let targetRow = currentFocus.row;
      let targetCol = currentFocus.col;
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
    const currentValue = currentGrid[currentFocus.row]?.[currentFocus.col] ?? '';
    const solvedIds = store.get(solved_entry_ids_atom);
    const isCellSolvedNow = (row: number, col: number) =>
      findEntriesAtCell(entries, row, col).some((entry) => solvedIds.includes(entry.id));

    // Solved entry cells are locked exactly like prefilled hint cells: they
    // remain visible but cannot be erased, even where entries intersect.
    if (
      isEditableCell(template ?? null) &&
      currentValue !== '' &&
      !isCellSolvedNow(currentFocus.row, currentFocus.col)
    ) {
      const nextGrid = currentGrid.map((row) => [...row]);
      nextGrid[currentFocus.row]![currentFocus.col] = '';
      setPlayerGrid(nextGrid);
      applyEvaluation(nextGrid);
      return;
    }

    const entry = entries.find((e) => e.id === currentFocus.entryId);
    if (!entry) return;

    // Step back past prefilled hints so backspace isn't blocked mid-word.
    let prevCell = nextCellInEntry(entry, currentFocus.row, currentFocus.col, -1);
    while (prevCell && isFixedCell(puzzle.grid[prevCell.row]![prevCell.col]!)) {
      prevCell = nextCellInEntry(entry, prevCell.row, prevCell.col, -1);
    }
    if (!prevCell) return;

    setFocus({ ...currentFocus, row: prevCell.row, col: prevCell.col });

    if (
      isEditableCell(puzzle.grid[prevCell.row]![prevCell.col]!) &&
      !isCellSolvedNow(prevCell.row, prevCell.col)
    ) {
      const nextGrid = currentGrid.map((row) => [...row]);
      nextGrid[prevCell.row]![prevCell.col] = '';
      setPlayerGrid(nextGrid);
      applyEvaluation(nextGrid);
    }
  }, [applyEvaluation, completed, entries, puzzle, setFocus, setPlayerGrid, started, store]);

  const moveWithArrow = useCallback(
    (key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
      const currentFocus = store.get(active_focus_atom);
      if (!puzzle || !started || completed || !currentFocus) return;

      const delta =
        key === 'ArrowUp'
          ? { dRow: -1, dCol: 0, direction: 'down' as const }
          : key === 'ArrowDown'
            ? { dRow: 1, dCol: 0, direction: 'down' as const }
            : key === 'ArrowLeft'
              ? { dRow: 0, dCol: -1, direction: 'across' as const }
              : { dRow: 0, dCol: 1, direction: 'across' as const };

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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!started || completed) return;
      if (store.get(revealing_entry_id_atom)) return;

      if (event.key === 'Tab') {
        event.preventDefault();
        if (!focus || entries.length === 0 || !puzzle) return;
        const index = entries.findIndex((e) => e.id === focus.entryId);
        const dir = event.shiftKey ? -1 : 1;
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
    [
      backspace,
      completed,
      entries,
      focus,
      focusCell,
      moveWithArrow,
      puzzle,
      setFocus,
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

      const isProtectedCell = (row: number, col: number) => {
        if (isFixedCell(puzzle.grid[row]?.[col] ?? null)) return true;
        return findEntriesAtCell(entries, row, col).some((e) => solvedIds.includes(e.id));
      };

      // Longest contiguous correct prefix from the start of the word.
      let prefixLen = 0;
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]!;
        const letter = getCellLetter(currentGrid, puzzle.grid, cell.row, cell.col).toUpperCase();
        if (letter === answer[i]) {
          prefixLen += 1;
        } else {
          break;
        }
      }

      if (prefixLen >= answer.length) return;

      // Trailing incorrect letters to erase (right→left), skipping protected cells.
      const clears: { row: number; col: number }[] = [];
      for (let i = cells.length - 1; i >= prefixLen; i--) {
        const cell = cells[i]!;
        if (isProtectedCell(cell.row, cell.col)) continue;
        const current = (currentGrid[cell.row]?.[cell.col] ?? '').toUpperCase();
        if (current === '' || current === answer[i]) continue;
        clears.push({ row: cell.row, col: cell.col });
      }

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
        const isCellSolvedNow = (row: number, col: number) =>
          findEntriesAtCell(entries, row, col).some((e) => freshSolved.includes(e.id));

        const isEnterable = (row: number, col: number) => {
          if (!isEditableCell(puzzle.grid[row]![col]!)) return false;
          if (isCellSolvedNow(row, col)) return false;
          return (nextGrid[row]?.[col] ?? '') === '';
        };

        let next = nextCellInEntry(entry, revealCell.row, revealCell.col, 1);
        while (next && !isEnterable(next.row, next.col)) {
          next = nextCellInEntry(entry, next.row, next.col, 1);
        }
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
