'use client';

import { useAtomValue } from 'jotai';
import { useMemo, useRef } from 'react';
import { CrossWordCell } from './CrossWordCell';
import {
  active_focus_atom,
  incorrect_entry_ids_atom,
  numbered_entries_atom,
  puzzle_atom,
  solved_entry_ids_atom
} from './game_state';
import { cellKey, getEntryCells, isBlockedCell, isFixedCell } from '~/util/cross_word/cross_word_schema';
import { useCrossWordGame } from './useCrossWordGame';

type CrossWordGridProps = {
  game: ReturnType<typeof useCrossWordGame>;
};

export function CrossWordGrid({ game }: CrossWordGridProps) {
  const puzzle = useAtomValue(puzzle_atom);
  const entries = useAtomValue(numbered_entries_atom);
  const focus = useAtomValue(active_focus_atom);
  const solvedIds = useAtomValue(solved_entry_ids_atom);
  const incorrectIds = useAtomValue(incorrect_entry_ids_atom);
  const boardRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={boardRef}
      tabIndex={0}
      role="grid"
      aria-label={`${puzzle.title} crossword grid`}
      className="mx-auto w-full max-w-[min(100vw-2rem,22rem)] outline-none sm:max-w-[24rem]"
      onClick={() => boardRef.current?.focus()}
    >
      <div
        className="grid aspect-square w-full gap-px border-2 border-border bg-border"
        style={{
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
                  incorrect={incorrect}
                  disabled={!game.started || game.completed}
                  onSelect={() => {
                    if (!game.started || game.completed) return;
                    game.focusCell(r, c, {
                      toggle: focus?.row === r && focus?.col === c
                    });
                    boardRef.current?.focus();
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
