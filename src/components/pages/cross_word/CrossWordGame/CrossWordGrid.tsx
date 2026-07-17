'use client';

import { useAtomValue } from 'jotai';
import { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CrossWordCell } from './CrossWordCell';
import {
  active_focus_atom,
  incorrect_entry_ids_atom,
  numbered_entries_atom,
  puzzle_atom,
  solved_entry_ids_atom
} from './game_state';
import { cellKey, getEntryCells, isBlockedCell, isFixedCell } from '~/util/cross_word/game_model';
import { useCrossWordGame } from './useCrossWordGame';

type CrossWordGridProps = {
  game: ReturnType<typeof useCrossWordGame>;
  /**
   * Called synchronously inside the cell-tap gesture after selection updates.
   * Used by the native-input fallback to focus a hidden `<input>` so iOS/Android
   * can open the OS soft keyboard (focus deferred to an effect often fails).
   */
  onRequestKeyboard?: () => void;
};

export function CrossWordGrid({ game, onRequestKeyboard }: CrossWordGridProps) {
  const puzzle = useAtomValue(puzzle_atom);
  const entries = useAtomValue(numbered_entries_atom);
  const focus = useAtomValue(active_focus_atom);
  const solvedIds = useAtomValue(solved_entry_ids_atom);
  const incorrectIds = useAtomValue(incorrect_entry_ids_atom);
  const boardRef = useRef<HTMLDivElement>(null);

  // Track which cells were "just solved" so we can fire the pulse animation once
  const prevSolvedIdsRef = useRef<string[]>([]);
  const [justSolvedCells, setJustSolvedCells] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prevIds = prevSolvedIdsRef.current;
    const newlysolvedEntryIds = solvedIds.filter((id) => !prevIds.includes(id));
    if (newlysolvedEntryIds.length === 0) {
      prevSolvedIdsRef.current = solvedIds;
      return;
    }

    const newCellKeys = new Set<string>();
    for (const entryId of newlysolvedEntryIds) {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) continue;
      for (const cell of getEntryCells(entry)) {
        newCellKeys.add(cellKey(cell.row, cell.col));
      }
    }

    prevSolvedIdsRef.current = solvedIds;
    setJustSolvedCells(newCellKeys);

    const timer = setTimeout(() => setJustSolvedCells(new Set()), 600);
    return () => clearTimeout(timer);
  }, [solvedIds, entries]);

  const clueNumberByCell = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      const key = cellKey(entry.row, entry.col);
      if (!map.has(key)) map.set(key, entry.number);
    }
    return map;
  }, [entries]);

  const incorrectOnlyCells = useMemo(() => {
    const solvedCellKeys = new Set<string>();
    for (const entry of entries) {
      if (!solvedIds.includes(entry.id)) continue;
      for (const cell of getEntryCells(entry)) {
        solvedCellKeys.add(cellKey(cell.row, cell.col));
      }
    }

    const set = new Set<string>();
    for (const entry of entries) {
      if (!incorrectIds.includes(entry.id)) continue;
      for (const cell of getEntryCells(entry)) {
        const key = cellKey(cell.row, cell.col);
        if (!solvedCellKeys.has(key)) set.add(key);
      }
    }
    return set;
  }, [entries, incorrectIds, solvedIds]);

  if (!puzzle) return null;

  const [rows, cols] = puzzle.dimensions;

  return (
    <motion.div
      ref={boardRef}
      tabIndex={0}
      role="grid"
      aria-label={`${puzzle.title} crossword grid`}
      className="mx-auto w-full max-w-[min(100vw-2rem,22rem)] outline-none sm:max-w-[24rem] lg:max-w-100 xl:max-w-104 2xl:max-w-108"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div
        className="grid aspect-square w-full overflow-hidden rounded-2xl border-[3px] border-[oklch(0.90_0.01_250)] bg-[oklch(0.90_0.01_250)] p-1 shadow-[0_10px_30px_oklch(0_0_0/0.08)] dark:border-[oklch(0.24_0.04_250)] dark:bg-[oklch(0.22_0.04_250)] dark:shadow-[0_16px_40px_oklch(0.15_0.04_250/0.45)]"
        style={{
          gap: '3px',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((template, c) => {
            const blocked = isBlockedCell(template);
            const fixed = isFixedCell(template);
            const selected = focus?.row === r && focus?.col === c;
            const inActiveWord = game.isCellInActiveWord(r, c);
            const solved = game.isCellSolved(r, c);
            const incorrect = incorrectOnlyCells.has(cellKey(r, c));
            const justSolved = justSolvedCells.has(cellKey(r, c));

            return (
              <div
                key={cellKey(r, c)}
                role="gridcell"
                aria-rowindex={r + 1}
                aria-colindex={c + 1}
                className="relative min-h-0 min-w-0"
              >
                <CrossWordCell
                  row={r}
                  col={c}
                  letter={game.getDisplayLetter(r, c)}
                  clueNumber={clueNumberByCell.get(cellKey(r, c))}
                  blocked={blocked}
                  fixed={fixed}
                  selected={!!selected}
                  inActiveWord={inActiveWord}
                  solved={solved}
                  justSolved={justSolved}
                  incorrect={incorrect}
                  disabled={!game.started || game.completed}
                  onSelect={() => {
                    if (!game.started || game.completed) return;
                    game.focusCell(r, c, {
                      toggle: focus?.row === r && focus?.col === c
                    });
                    // Must focus the hidden input inside the same tap gesture (iOS).
                    onRequestKeyboard?.();
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
