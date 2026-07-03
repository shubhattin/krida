import { useDrag } from '@use-gesture/react';
import { useEffect, useRef, type RefObject, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { FONT_INFO } from '~/state/script_font_data';
import { cn } from '~/lib/utils';
import { useAtom } from 'jotai';
import {
  type CellPosition,
  started_atom,
  completed_atom,
  current_selection_atom,
  found_words_atom,
  grid_data_current_atom,
  grid_dimensions_atom,
  total_attempts_atom,
  original_word_list_atom,
  word_msgs_atom
} from './game_state';
import { AppContext } from '~/components/AppDataContext';
import type { location_list_type } from '~/db/types';
import { FaPlay } from 'react-icons/fa';
import { useStartPuzzleGame } from './useStartPuzzleGame';

type Props = {
  puzzle_id: number;
  timerRef: RefObject<NodeJS.Timeout | null>;
  original_grid_data: string[][];
  location: location_list_type;
};

export const GameGrid = ({ timerRef, original_grid_data }: Props) => {
  const { script } = useContext(AppContext);
  const [started] = useAtom(started_atom);
  const [completed, setCompleted] = useAtom(completed_atom);
  const [currentSelection, setCurrentSelection] = useAtom(current_selection_atom);
  const [foundWords, setFoundWords] = useAtom(found_words_atom);
  const [gridData] = useAtom(grid_data_current_atom);
  const [gridDimensions] = useAtom(grid_dimensions_atom);
  const [, setTotalAttempts] = useAtom(total_attempts_atom);
  const [wordList] = useAtom(original_word_list_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);

  const handleStart = useStartPuzzleGame(timerRef);
  const rows = gridDimensions[0] > 0 ? gridDimensions[0] : original_grid_data.length;
  const cols = gridDimensions[1] > 0 ? gridDimensions[1] : original_grid_data[0].length;
  const gridRef = useRef<HTMLDivElement>(null);

  // Mutable ref to track the live selection during a drag gesture.
  // React state (`currentSelection`) is captured in closures at render-time,
  // so the useDrag callback would see stale values. This ref is the
  // source-of-truth inside the gesture handler; we sync it back to the
  // atom for rendering.
  const selectionRef = useRef<CellPosition[]>([]);

  const [demoPath, setDemoPath] = useState<CellPosition[]>([]);
  const [demoState, setDemoState] = useState<'idle' | 'selecting' | 'success' | 'fail'>('idle');
  const [handPos, setHandPos] = useState<CellPosition | null>(null);
  const [lastHandPos, setLastHandPos] = useState<CellPosition | null>(null);

  useEffect(() => {
    if (handPos) {
      setLastHandPos(handPos);
    }
  }, [handPos]);

  useEffect(() => {
    if (started || completed) {
      setDemoPath([]);
      setDemoState('idle');
      setHandPos(null);
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const startCycle = async () => {
      if (!isMounted) return;

      // 1. Idle state for 1.5s
      setDemoPath([]);
      setDemoState('idle');
      // Do not clear handPos to keep it on screen and transition from the previous path end
      await new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 1500);
      });

      if (!isMounted) return;

      // 2. Generate random path
      const path = generateRandomPath(rows, cols);
      if (path.length < 2) {
        startCycle();
        return;
      }

      // 3. Trace cells one by one
      setDemoState('selecting');
      for (let i = 0; i < path.length; i++) {
        if (!isMounted) return;
        const currentPath = path.slice(0, i + 1);
        setDemoPath(currentPath);
        setHandPos(path[i]);
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 600);
        });
      }

      if (!isMounted) return;

      // 4. Set final state (success or failure)
      const isSuccess = Math.random() < 0.65;
      setDemoState(isSuccess ? 'success' : 'fail');

      // Keep showing the final path and hand emoji for 1.5s
      await new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 1500);
      });

      if (!isMounted) return;

      // Repeat cycle
      startCycle();
    };

    startCycle();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [started, completed, rows, cols]);

  const font_info = FONT_INFO[script!];

  // Prevent pull-to-refresh and other navigation gestures
  useEffect(() => {
    if (!started || completed) return;

    const preventNavigation = (e: TouchEvent) => {
      // Prevent pull-to-refresh and navigation gestures
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const target = e.target as Element;

        // Check if touch started on the game grid
        if (
          target &&
          (target.closest('[data-game-grid]') || target.hasAttribute('data-game-grid'))
        ) {
          e.preventDefault();
        }
      }
    };

    const preventOverscroll = (e: TouchEvent) => {
      // Prevent overscroll bounce that can trigger refresh
      if (e.touches.length === 1) {
        const target = e.target as Element;
        if (
          target &&
          (target.closest('[data-game-grid]') || target.hasAttribute('data-game-grid'))
        ) {
          e.preventDefault();
        }
      }
    };

    const preventContextMenu = (e: Event) => {
      // Prevent long press context menu on mobile
      const target = e.target as Element;
      if (target && (target.closest('[data-game-grid]') || target.hasAttribute('data-game-grid'))) {
        e.preventDefault();
      }
    };

    const preventDoubleClick = (e: Event) => {
      // Prevent double-click zoom on mobile
      const target = e.target as Element;
      if (target && (target.closest('[data-game-grid]') || target.hasAttribute('data-game-grid'))) {
        e.preventDefault();
      }
    };

    // Add event listeners to document to catch all touch events
    document.addEventListener('touchstart', preventNavigation, { passive: false });
    document.addEventListener('touchmove', preventOverscroll, { passive: false });
    document.addEventListener('contextmenu', preventContextMenu, { passive: false });
    document.addEventListener('dblclick', preventDoubleClick, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventNavigation);
      document.removeEventListener('touchmove', preventOverscroll);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('dblclick', preventDoubleClick);
    };
  }, [started, completed]);

  // helper to go from a cell index to its pixel center
  const getCenter = ({ row, col }: CellPosition) => {
    if (!gridRef.current) return { x: 0, y: 0 };

    // Always use fresh getBoundingClientRect for most accurate positioning,
    // especially important on mobile devices where viewport can change dynamically
    const parentRect = gridRef.current.getBoundingClientRect();
    const cell = gridRef.current.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (!cell) return { x: 0, y: 0 };

    const cellRect = cell.getBoundingClientRect();
    return {
      x: cellRect.left + cellRect.width / 2 - parentRect.left,
      y: cellRect.top + cellRect.height / 2 - parentRect.top
    };
  };

  // hit-test using elementFromPoint (as before)
  const getCellFromEvent = (e: any): CellPosition | null => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return null;

    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>('[data-row][data-col]');
    if (!target) return null;

    const row = parseInt(target.dataset.row!, 10);
    const col = parseInt(target.dataset.col!, 10);
    if (
      Number.isNaN(row) ||
      Number.isNaN(col) ||
      row < 0 ||
      row >= rows ||
      col < 0 ||
      col >= cols
    ) {
      return null;
    }
    return { row, col };
  };

  // Helper to try adding a cell to the live selection ref.
  // Returns the updated array (same reference if nothing changed).
  const tryAddCell = (sel: CellPosition[], cell: CellPosition): CellPosition[] => {
    const { row, col } = cell;
    if (isCellInFoundWords(row, col)) return sel;

    if (sel.length === 0) {
      return [{ row, col }];
    }

    const lastCell = sel[sel.length - 1];
    // Same cell — nothing to do
    if (lastCell.row === row && lastCell.col === col) return sel;

    const rowDiff = Math.abs(row - lastCell.row);
    const colDiff = Math.abs(col - lastCell.col);
    const alreadySelected = sel.some((c) => c.row === row && c.col === col);

    if (!alreadySelected && rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0)) {
      return [...sel, { row, col }];
    }
    return sel;
  };

  // Enhanced drag logic with better mobile support
  const bind = useDrag(
    ({ event, first, down, last, cancel }) => {
      if (!started || completed) {
        // Allow native scroll behavior on mobile when game is off
        return;
      }

      // Aggressively prevent default for all game-related events
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (first) {
        selectionRef.current = [];
        setCurrentSelection([]);
        // Additional prevention for iOS Safari
        if (event && 'touches' in event) {
          event.preventDefault();
        }
      }

      if (down) {
        const cell = getCellFromEvent(event);
        if (!cell) return;

        const next = tryAddCell(selectionRef.current, cell);
        if (next !== selectionRef.current) {
          selectionRef.current = next;
          setCurrentSelection(next);
        }
      }

      if (last) {
        // On mobile, the final touch position may not have been processed
        // in a preceding `down` event, so try to add it now.
        const cell = getCellFromEvent(event);
        if (cell) {
          const next = tryAddCell(selectionRef.current, cell);
          if (next !== selectionRef.current) {
            selectionRef.current = next;
            // No need to setCurrentSelection here since we clear it below
          }
        }

        // Use the ref (always up-to-date) instead of the stale closure value
        const finalSelection = selectionRef.current;
        const word = getWordFromSelection(finalSelection);

        if (finalSelection.length >= 2) {
          // Track attempt only if selection has at least 2 cells
          setTotalAttempts((prev) => prev + 1);

          if (wordList.includes(word)) {
            setFoundWords((prev) => [...prev, { cells: [...finalSelection], word }]);
          }
        }
        selectionRef.current = [];
        setCurrentSelection([]);
      }
    },
    {
      // Enhanced event options for better mobile support
      eventOptions: {
        passive: false,
        capture: true
      },
      // Prevent default on all interactions
      preventDefault: true,
      // Configure touch-specific behavior
      touch: {
        target: gridRef
      }
    }
  );

  // build the SVG <polyline> points strings
  const buildPoints = (cells: CellPosition[]) =>
    cells
      .map((c) => {
        const { x, y } = getCenter(c);
        return `${x},${y}`;
      })
      .join(' ');

  // helpers for hit-testing and coloring
  const isCellInCurrentSelection = (r: number, c: number) =>
    currentSelection.some((cell) => cell.row === r && cell.col === c);
  const isCellInFoundWords = (r: number, c: number) =>
    foundWords.some((sel) => sel.cells.some((cell) => cell.row === r && cell.col === c));
  const getWordFromSelection = (sel: CellPosition[]) =>
    sel.map((cell) => original_grid_data[cell.row][cell.col]).join('');

  // Check for puzzle completion
  useEffect(() => {
    if (foundWords.length === wordList.length && foundWords.length > 0 && started) {
      setCompleted(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [foundWords.length, wordList.length, started]);

  const displayPos = handPos ?? lastHandPos;
  const isVisible = !!handPos && !started && !completed;

  return (
    <>
      <div className="w-full">
        {/* Game Grid Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2.5 shadow-2xl sm:p-4 md:p-6 dark:border-slate-700 dark:bg-slate-800">
          {/* relative wrapper for grid + overlay */}
          <div className="relative">
            {/* Game Grid */}
            <div
              ref={gridRef}
              {...bind()}
              data-game-grid
              className={cn(
                'relative z-10 mx-auto grid h-full w-full select-none',
                'gap-1.5 sm:gap-2.5 md:gap-3',
                // Enhanced touch handling for all states
                'touch-none'
              )}
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                maxWidth: 'min(100%, min(90vw, 450px))',
                // Additional CSS properties for mobile gesture prevention
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                touchAction: started && !completed ? 'none' : 'pan-y',
                // Prevent iOS Safari bounce and zoom
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {gridData.map((row, ri) =>
                row.map((letter, ci) => (
                  <GridCell
                    key={`${ri}-${ci}`}
                    row={ri}
                    col={ci}
                    letter={letter}
                    fontInfo={font_info}
                    started={started}
                    currentSelection={currentSelection}
                    foundWords={foundWords}
                    demoPath={demoPath}
                    demoState={demoState}
                  />
                ))
              )}
              {/* Hand Pointer overlay inside the grid */}
              <motion.div
                style={{
                  position: 'absolute',
                  zIndex: 35,
                  pointerEvents: 'none'
                }}
                initial={false}
                animate={{
                  left: displayPos ? `${((displayPos.col + 0.5) / cols) * 100}%` : '50%',
                  top: displayPos ? `${((displayPos.row + 0.5) / rows) * 100}%` : '50%',
                  opacity: isVisible ? 1 : 0,
                  scale: isVisible ? 1 : 0.8
                }}
                transition={{
                  left: { type: 'spring', stiffness: 100, damping: 15 },
                  top: { type: 'spring', stiffness: 100, damping: 15 },
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 }
                }}
                className="pointer-events-none -translate-x-1/2 translate-y-[-15%] text-2xl drop-shadow-md select-none sm:text-3xl"
              >
                👆
              </motion.div>
            </div>

            {/* Overlay SVG for trails */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Found words trails in green with glow effect */}
              {foundWords.map((sel, i) => (
                <g key={i}>
                  {/* Glow effect */}
                  <polyline
                    points={buildPoints(sel.cells)}
                    fill="none"
                    className="stroke-emerald-300 dark:stroke-emerald-400"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.3}
                  />
                  {/* Main line */}
                  <polyline
                    points={buildPoints(sel.cells)}
                    fill="none"
                    className="stroke-emerald-500 dark:stroke-emerald-400"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}

              {/* Current selection trail in blue with glow effect */}
              {currentSelection.length > 1 && (
                <g>
                  {/* Glow effect */}
                  <polyline
                    points={buildPoints(currentSelection)}
                    fill="none"
                    className="stroke-blue-300 dark:stroke-blue-400"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.3}
                  />
                  {/* Main line */}
                  <polyline
                    points={buildPoints(currentSelection)}
                    fill="none"
                    className="stroke-blue-500 dark:stroke-blue-400"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
              {/* Demo path trail */}
              {!started && demoPath.length > 1 && (
                <g>
                  {/* Glow effect */}
                  <polyline
                    points={buildPoints(demoPath)}
                    fill="none"
                    className={cn(
                      demoState === 'success' && 'stroke-emerald-300 dark:stroke-emerald-400',
                      demoState === 'fail' && 'stroke-red-300 dark:stroke-red-400',
                      demoState === 'selecting' && 'stroke-blue-300 dark:stroke-blue-400'
                    )}
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.3}
                  />
                  {/* Main line */}
                  <polyline
                    points={buildPoints(demoPath)}
                    fill="none"
                    className={cn(
                      demoState === 'success' && 'stroke-emerald-500 dark:stroke-emerald-400',
                      demoState === 'fail' && 'stroke-red-500 dark:stroke-red-400',
                      demoState === 'selecting' && 'stroke-blue-500 dark:stroke-blue-400'
                    )}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
            </svg>

            {/* Play Button Overlay - centered over the grid */}
            {!started && (
              <button
                onClick={() => handleStart()}
                className={cn(
                  // Blue gradient with light and dark variants
                  'group absolute inset-0 z-20 m-auto size-fit overflow-hidden',
                  'bg-linear-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
                  'dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800',
                  'rounded-xl px-3 pt-2.5 pb-1 font-bold text-white shadow-lg hover:shadow-xl sm:rounded-2xl sm:px-5 sm:py-4 sm:pb-2',
                  'transform transition-all duration-200 hover:scale-105 active:scale-95',
                  'flex items-center justify-center space-x-2 sm:space-x-3',
                  font_info.className
                )}
              >
                <FaPlay className="-mt-2 size-5 sm:size-6 md:size-6.5 lg:size-7" />
                <span className="text-xl sm:text-2xl">{wordMsgs.play}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

type GridCellProps = {
  row: number;
  col: number;
  letter: string;
  fontInfo: { fontSize: number; className: string };
  started: boolean;
  currentSelection: CellPosition[];
  foundWords: { cells: CellPosition[]; word: string }[];
  demoPath: CellPosition[];
  demoState: 'idle' | 'selecting' | 'success' | 'fail';
};

const GridCell = ({
  row,
  col,
  letter,
  fontInfo,
  started,
  currentSelection,
  foundWords,
  demoPath,
  demoState
}: GridCellProps) => {
  const isInCurrent = currentSelection.some((cell) => cell.row === row && cell.col === col);
  const isInFound = foundWords.some((sel) =>
    sel.cells.some((cell) => cell.row === row && cell.col === col)
  );
  const isInDemo = demoPath.some((cell) => cell.row === row && cell.col === col);
  const isLast =
    isInCurrent &&
    currentSelection.length !== 0 &&
    currentSelection.at(-1)?.row === row &&
    currentSelection.at(-1)?.col === col;

  return (
    <div
      data-row={row}
      data-col={col}
      data-game-grid
      style={{
        fontSize: `${fontInfo.fontSize}rem`,
        // Additional mobile gesture prevention
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none'
      }}
      className={cn(
        fontInfo.className,
        !started && 'blur-sm',
        started && 'cursor-pointer',
        'text-base',
        'flex items-center justify-center rounded-3xl px-px py-0 text-center font-bold sm:rounded-2xl',
        'aspect-square border-2 sm:p-1 md:p-2',
        'transform transition-all duration-300 ease-out',
        'hover:scale-105 active:scale-95',
        'border-slate-300 bg-linear-to-br from-white to-slate-50 dark:border-slate-600 dark:from-slate-700 dark:to-slate-800',
        'shadow-lg hover:shadow-xl',
        isInDemo &&
          !started && [
            demoState === 'success' &&
              'border-emerald-400 bg-linear-to-br from-emerald-100 to-green-200 text-emerald-800 shadow-emerald-200 dark:border-emerald-500 dark:from-emerald-900 dark:to-green-800 dark:text-emerald-100 dark:shadow-emerald-900',
            demoState === 'fail' &&
              'border-red-400 bg-linear-to-br from-red-100 to-rose-200 text-red-800 shadow-red-200 dark:border-red-500 dark:from-red-900 dark:to-rose-800 dark:text-red-100 dark:shadow-red-900',
            demoState === 'selecting' &&
              'border-blue-400 bg-linear-to-br from-blue-100 to-indigo-200 text-blue-800 shadow-blue-200 dark:border-blue-500 dark:from-blue-900 dark:to-indigo-800 dark:text-blue-100 dark:shadow-blue-900'
          ],
        isInFound && [
          'border-emerald-400 dark:border-emerald-500',
          'bg-linear-to-br from-emerald-100 to-green-200 dark:from-emerald-900 dark:to-green-800',
          'text-emerald-800 dark:text-emerald-100',
          'shadow-emerald-200 dark:shadow-emerald-900'
        ],
        isInCurrent &&
          !isInFound && [
            'border-blue-400 dark:border-blue-500',
            'bg-linear-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-800',
            'text-blue-800 dark:text-blue-100',
            'shadow-blue-200 dark:shadow-blue-900'
          ],
        isLast && 'ring-opacity-50 ring-4 ring-blue-300 dark:ring-blue-600',
        !isInCurrent &&
          !isInFound &&
          started &&
          'hover:bg-linear-to-br hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-600 dark:hover:to-slate-700'
      )}
    >
      {letter}
    </div>
  );
};

const isCenterCell = (r: number, c: number, rows: number, cols: number) => {
  const midRow = (rows - 1) / 2;
  const midCol = (cols - 1) / 2;
  // If the cell is in the middle region where play overlay lies
  return Math.abs(r - midRow) < 1 && Math.abs(c - midCol) < 1;
};

const generateRandomPath = (rows: number, cols: number): CellPosition[] => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);

    if (isCenterCell(startRow, startCol, rows, cols)) {
      continue;
    }

    const path: CellPosition[] = [{ row: startRow, col: startCol }];
    const targetLength = Math.floor(Math.random() * 3) + 2; // Length 2, 3, or 4

    let current = { row: startRow, col: startCol };
    let success = true;

    for (let step = 1; step < targetLength; step++) {
      const neighbors: CellPosition[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = current.row + dr;
          const nc = current.col + dc;

          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (isCenterCell(nr, nc, rows, cols)) continue;
          if (path.some((p) => p.row === nr && p.col === nc)) continue;

          neighbors.push({ row: nr, col: nc });
        }
      }

      if (neighbors.length === 0) {
        success = false;
        break;
      }

      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      path.push(next);
      current = next;
    }

    if (success && path.length >= 2) {
      return path;
    }
  }
  return [];
};
