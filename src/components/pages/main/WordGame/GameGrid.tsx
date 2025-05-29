import { useDrag } from '@use-gesture/react';
import { useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { FONT_INFO, type ScriptType } from '~/state/script_font_data';
import { type CellPosition } from './GameController';
import { cn } from '~/lib/utils';
import TurnstileWidget from '~/components/Turnstile';
import { client_q } from '~/api/client';
import { useTurnstile } from 'react-turnstile';

type Props = {
  puzzle_id: number;
  seconds: number;
  gridRef: RefObject<HTMLDivElement | null>;
  rows: number;
  cols: number;
  script: ScriptType;
  gridData: string[][];
  started: boolean;
  completed: boolean;
  currentSelection: CellPosition[];
  word_list: string[];
  grid_data: string[][];
  foundWords: { cells: CellPosition[]; word: string }[];
  timerRef: RefObject<NodeJS.Timeout | null>;
  totalAttempts: number;
  correctAttempts: number;
  setCurrentSelection: Dispatch<SetStateAction<CellPosition[]>>;
  setFoundWords: Dispatch<SetStateAction<{ cells: CellPosition[]; word: string }[]>>;
  setCompleted: Dispatch<SetStateAction<boolean>>;
  setTotalAttempts: Dispatch<SetStateAction<number>>;
  setCorrectAttempts: Dispatch<SetStateAction<number>>;
};

export const GameGrid = ({
  puzzle_id,
  seconds,
  gridRef,
  cols,
  rows,
  script,
  completed,
  currentSelection,
  gridData,
  started,
  word_list,
  foundWords,
  grid_data,
  timerRef,
  totalAttempts,
  correctAttempts,
  setCurrentSelection,
  setFoundWords,
  setCompleted,
  setTotalAttempts,
  setCorrectAttempts
}: Props) => {
  const font_info = FONT_INFO[script];
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstile = useTurnstile();
  const submit_stats_mut = client_q.padavali.stats.submit_stats.useMutation({
    onSuccess() {
      turnstile.reset();
    }
  });
  const PROD = process.env.NODE_ENV === 'production';
  const submit_stats = async () => {
    if (!turnstileToken || !PROD) return;
    await submit_stats_mut.mutateAsync({
      turnstile_token: turnstileToken,
      info: {
        puzzle_id: puzzle_id,
        time_taken: seconds,
        accuracy: Math.trunc((correctAttempts / totalAttempts) * 100),
        correct_attempts: correctAttempts,
        total_attempts: totalAttempts
      }
    });
  };

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
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
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
        setCurrentSelection([]);
        // Additional prevention for iOS Safari
        if (event && 'touches' in event) {
          event.preventDefault();
        }
      }

      if (down) {
        const cell = getCellFromEvent(event);
        if (!cell) return;
        const { row, col } = cell;
        if (isCellInFoundWords(row, col)) return;

        if (currentSelection.length === 0) {
          setCurrentSelection([{ row, col }]);
        } else {
          const lastCell = currentSelection[currentSelection.length - 1];
          const rowDiff = Math.abs(row - lastCell.row);
          const colDiff = Math.abs(col - lastCell.col);
          if (
            !isCellInCurrentSelection(row, col) &&
            rowDiff <= 1 &&
            colDiff <= 1 &&
            (rowDiff !== 0 || colDiff !== 0)
          ) {
            setCurrentSelection((prev) => [...prev, { row, col }]);
          }
        }
      }

      if (last) {
        const word = getWordFromSelection(currentSelection);
        if (currentSelection.length >= 2) {
          // Track attempt only if selection has at least 2 cells
          setTotalAttempts((prev) => prev + 1);

          if (word_list.includes(word)) {
            setFoundWords((prev) => [...prev, { cells: [...currentSelection], word }]);
            setCorrectAttempts((prev) => prev + 1);
          }
        }
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
    sel.map((cell) => grid_data[cell.row][cell.col]).join('');

  // Check for puzzle completion
  useEffect(() => {
    if (foundWords.length === word_list.length && foundWords.length > 0 && started) {
      setCompleted(true);
      submit_stats();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [foundWords.length, word_list.length, started]);

  return (
    <>
      <TurnstileWidget setToken={setTurnstileToken} />
      <div className="w-full">
        {/* Game Grid Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2.5 shadow-2xl sm:p-4 md:p-6 dark:border-slate-700 dark:bg-slate-800">
          {/* relative wrapper for grid + overlay */}
          <div className="relative">
            {/* Grid Header */}

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
                  />
                ))
              )}
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
            </svg>
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
  fontInfo: { fontSize: number; clasName: string };
  started: boolean;
  currentSelection: CellPosition[];
  foundWords: { cells: CellPosition[]; word: string }[];
};

const GridCell = ({
  row,
  col,
  letter,
  fontInfo,
  started,
  currentSelection,
  foundWords
}: GridCellProps) => {
  const isInCurrent = currentSelection.some((cell) => cell.row === row && cell.col === col);
  const isInFound = foundWords.some((sel) =>
    sel.cells.some((cell) => cell.row === row && cell.col === col)
  );
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
        fontInfo.clasName,
        !started && 'blur-sm',
        started && 'cursor-pointer',
        'flex items-center justify-center rounded-3xl px-[1px] py-0 text-center font-bold sm:rounded-2xl',
        'aspect-square border-2 sm:p-1 md:p-2',
        'transform transition-all duration-300 ease-out',
        'hover:scale-105 active:scale-95',
        'border-slate-300 bg-gradient-to-br from-white to-slate-50 dark:border-slate-600 dark:from-slate-700 dark:to-slate-800',
        'shadow-lg hover:shadow-xl',
        isInFound && [
          'border-emerald-400 dark:border-emerald-500',
          'bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-900 dark:to-green-800',
          'text-emerald-800 dark:text-emerald-100',
          'shadow-emerald-200 dark:shadow-emerald-900'
        ],
        isInCurrent &&
          !isInFound && [
            'border-blue-400 dark:border-blue-500',
            'bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-800',
            'text-blue-800 dark:text-blue-100',
            'shadow-blue-200 dark:shadow-blue-900'
          ],
        isLast && 'ring-opacity-50 ring-4 ring-blue-300 dark:ring-blue-600',
        !isInCurrent &&
          !isInFound &&
          started &&
          'hover:bg-gradient-to-br hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-600 dark:hover:to-slate-700'
      )}
    >
      {letter}
    </div>
  );
};
