import { useDrag } from '@use-gesture/react';
import { useEffect, useRef, type RefObject, useContext } from 'react';
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
  correct_attempts_atom,
  original_word_list_atom,
  word_msgs_atom,
  seconds_atom
} from './game_state';
import { AppContext } from '~/components/AppDataContext';
import type { location_list_type } from '~/db/types';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import { FaPlay } from 'react-icons/fa';

type Props = {
  puzzle_id: number;
  timerRef: RefObject<NodeJS.Timeout | null>;
  original_grid_data: string[][];
  puzzle_uuid: string;
  location: location_list_type;
};

export const GameGrid = ({ puzzle_id, timerRef, original_grid_data, location }: Props) => {
  const { script } = useContext(AppContext);
  const [started] = useAtom(started_atom);
  const [completed, setCompleted] = useAtom(completed_atom);
  const [currentSelection, setCurrentSelection] = useAtom(current_selection_atom);
  const [foundWords, setFoundWords] = useAtom(found_words_atom);
  const [gridData] = useAtom(grid_data_current_atom);
  const [gridDimensions] = useAtom(grid_dimensions_atom);
  const [, setTotalAttempts] = useAtom(total_attempts_atom);
  const [, setCorrectAttempts] = useAtom(correct_attempts_atom);
  const [wordList] = useAtom(original_word_list_atom);

  const [rows, cols] = gridDimensions;
  const gridRef = useRef<SVGSVGElement>(null);

  const font_info = FONT_INFO[script!];
  const [wordMsgs] = useAtom(word_msgs_atom);
  const [, setStarted] = useAtom(started_atom);
  const [, setSeconds] = useAtom(seconds_atom);

  // SVG dimensions and layout calculations
  const cellSize = 100; // Base cell size in SVG units
  const cellGap = 15; // Gap between cells in SVG units (restored to original spacing)
  const cellRadius = 20; // Border radius for cells (restored to original)
  const svgWidth = cols * cellSize + (cols - 1) * cellGap;
  const svgHeight = rows * cellSize + (rows - 1) * cellGap;

  // Start the game
  const handleStart = () => {
    setStarted(true);
    setSeconds(0);
    setFoundWords([]);
    setCompleted(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
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

  // Helper to get cell position in SVG coordinates
  const getCellPosition = (row: number, col: number) => {
    const x = col * (cellSize + cellGap);
    const y = row * (cellSize + cellGap);
    return { x, y };
  };

  // helper to go from a cell index to its pixel center
  const getCenter = ({ row, col }: CellPosition) => {
    const { x, y } = getCellPosition(row, col);
    return {
      x: x + cellSize / 2,
      y: y + cellSize / 2
    };
  };

  // hit-test using elementFromPoint (adapted for SVG)
  const getCellFromEvent = (e: any): CellPosition | null => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return null;

    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<SVGElement>('[data-row][data-col]');
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
          if (lastCell.row === row && lastCell.col === col) return;
          // ^^ this is the edge case where a single cell's content are repeated
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
        // console.log('word', word);
        if (currentSelection.length >= 2) {
          // Track attempt only if selection has at least 2 cells
          setTotalAttempts((prev) => prev + 1);

          if (wordList.includes(word)) {
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

  return (
    <>
      <div className="w-full">
        {/* Game Grid Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2.5 shadow-2xl sm:p-4 md:p-6 dark:border-slate-700 dark:bg-slate-800">
          {/* relative wrapper for grid + overlay */}
          <div className="relative">
            {/* SVG Game Grid */}
            <svg
              ref={gridRef}
              {...bind()}
              data-game-grid
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className={cn(
                'relative z-10 mx-auto h-full w-full select-none',
                // Enhanced touch handling for all states
                'touch-none'
              )}
              style={{
                maxWidth: 'min(100%, min(90vw, 450px))',
                aspectRatio: `${svgWidth} / ${svgHeight}`,
                // Additional CSS properties for mobile gesture prevention
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                touchAction: started && !completed ? 'none' : 'pan-y',
                // Prevent iOS Safari bounce and zoom
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {/* SVG Definitions for gradients, filters, and effects */}
              <defs>
                {/* Default cell gradients - with subtle bluish tint */}
                <linearGradient id="defaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f1f5f9" />
                </linearGradient>
                <linearGradient id="defaultGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Current selection gradients - blue theme */}
                <linearGradient id="currentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dbeafe" />
                  <stop offset="100%" stopColor="#c7d2fe" />
                </linearGradient>
                <linearGradient id="currentGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="100%" stopColor="#3730a3" />
                </linearGradient>

                {/* Found words gradients - green theme */}
                <linearGradient id="foundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dcfce7" />
                  <stop offset="100%" stopColor="#bbf7d0" />
                </linearGradient>
                <linearGradient id="foundGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#064e3b" />
                  <stop offset="100%" stopColor="#14532d" />
                </linearGradient>

                {/* Hover gradients */}
                <linearGradient id="hoverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f1f5f9" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
                <linearGradient id="hoverGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>

                {/* Enhanced shadow filters */}
                <filter id="cellShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="4"
                    floodOpacity="0.1"
                    floodColor="#000000"
                  />
                  <feDropShadow
                    dx="0"
                    dy="1"
                    stdDeviation="2"
                    floodOpacity="0.06"
                    floodColor="#000000"
                  />
                </filter>
                <filter id="cellShadowHover" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="6"
                    floodOpacity="0.15"
                    floodColor="#000000"
                  />
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="4"
                    floodOpacity="0.1"
                    floodColor="#000000"
                  />
                </filter>

                {/* Enhanced shadow for found words */}
                <filter id="foundShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="4"
                    floodOpacity="0.1"
                    floodColor="#059669"
                  />
                  <feDropShadow
                    dx="0"
                    dy="1"
                    stdDeviation="2"
                    floodOpacity="0.06"
                    floodColor="#047857"
                  />
                </filter>

                {/* Enhanced shadow for current selection */}
                <filter id="currentShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="4"
                    floodOpacity="0.1"
                    floodColor="#2563eb"
                  />
                  <feDropShadow
                    dx="0"
                    dy="1"
                    stdDeviation="2"
                    floodOpacity="0.06"
                    floodColor="#1d4ed8"
                  />
                </filter>

                {/* Blur filter for when game hasn't started */}
                <filter id="blur">
                  <feGaussianBlur stdDeviation="1.5" />
                </filter>

                {/* Ring filter for last selected cell */}
                <filter id="ring" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="2"
                    floodColor="#3b82f6"
                    floodOpacity="0.5"
                  />
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="4"
                    floodColor="#93c5fd"
                    floodOpacity="0.3"
                  />
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="4"
                    floodOpacity="0.1"
                    floodColor="#2563eb"
                  />
                </filter>
                <filter id="ringDark" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="2"
                    floodColor="#2563eb"
                    floodOpacity="0.6"
                  />
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="4"
                    floodColor="#60a5fa"
                    floodOpacity="0.4"
                  />
                  <feDropShadow
                    dx="0"
                    dy="2"
                    stdDeviation="4"
                    floodOpacity="0.1"
                    floodColor="#1d4ed8"
                  />
                </filter>
              </defs>

              {/* Selection trails - rendered first so they appear behind cells */}
              {/* Found words trails in green with glow effect */}
              {foundWords.map((sel, i) => (
                <g key={i}>
                  {/* Glow effect */}
                  <polyline
                    points={buildPoints(sel.cells)}
                    fill="none"
                    stroke="#6ee7b7"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.3}
                  />
                  {/* Main line */}
                  <polyline
                    points={buildPoints(sel.cells)}
                    fill="none"
                    stroke="#10b981"
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
                    stroke="#93c5fd"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.3}
                  />
                  {/* Main line */}
                  <polyline
                    points={buildPoints(currentSelection)}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              {/* Render grid cells - rendered after trails so they appear on top */}
              {gridData.map((row, ri) =>
                row.map((letter, ci) => (
                  <GridCellSVG
                    key={`${ri}-${ci}`}
                    row={ri}
                    col={ci}
                    letter={letter}
                    fontInfo={font_info}
                    started={started}
                    currentSelection={currentSelection}
                    foundWords={foundWords}
                    cellSize={cellSize}
                    cellRadius={cellRadius}
                    getCellPosition={getCellPosition}
                  />
                ))
              )}
            </svg>

            {/* Play Button Overlay - centered over the grid */}
            {!started && (
              <button
                onClick={handleStart}
                className={cn(
                  // Blue gradient with light and dark variants
                  'group absolute inset-0 z-20 m-auto size-fit overflow-hidden',
                  'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600',
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

type GridCellSVGProps = {
  row: number;
  col: number;
  letter: string;
  fontInfo: { fontSize: number; className: string };
  started: boolean;
  currentSelection: CellPosition[];
  foundWords: { cells: CellPosition[]; word: string }[];
  cellSize: number;
  cellRadius: number;
  getCellPosition: (row: number, col: number) => { x: number; y: number };
};

const GridCellSVG = ({
  row,
  col,
  letter,
  fontInfo,
  started,
  currentSelection,
  foundWords,
  cellSize,
  cellRadius,
  getCellPosition
}: GridCellSVGProps) => {
  const isInCurrent = currentSelection.some((cell) => cell.row === row && cell.col === col);
  const isInFound = foundWords.some((sel) =>
    sel.cells.some((cell) => cell.row === row && cell.col === col)
  );
  const isLast =
    isInCurrent &&
    currentSelection.length !== 0 &&
    currentSelection.at(-1)?.row === row &&
    currentSelection.at(-1)?.col === col;

  const { x, y } = getCellPosition(row, col);

  // Simple dark mode detection
  const isDarkMode =
    typeof window !== 'undefined' &&
    (document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Determine colors, fill, and filters based on state and theme
  let fill = isDarkMode ? 'url(#defaultGradientDark)' : 'url(#defaultGradient)';
  let stroke = isDarkMode ? '#475569' : '#cbd5e1'; // slate-600 : slate-300
  let strokeWidth = 2;
  let textFill = isDarkMode ? '#e2e8f0' : '#1e293b'; // slate-200 : slate-800
  let shadowFilter = 'url(#cellShadow)';

  if (isInFound) {
    fill = isDarkMode ? 'url(#foundGradientDark)' : 'url(#foundGradient)';
    stroke = isDarkMode ? '#10b981' : '#4ade80'; // emerald-500 : emerald-400
    textFill = isDarkMode ? '#a7f3d0' : '#064e3b'; // emerald-200 : emerald-800
    shadowFilter = 'url(#foundShadow)';
  } else if (isInCurrent) {
    fill = isDarkMode ? 'url(#currentGradientDark)' : 'url(#currentGradient)';
    stroke = isDarkMode ? '#3b82f6' : '#60a5fa'; // blue-500 : blue-400
    textFill = isDarkMode ? '#bfdbfe' : '#1e40af'; // blue-200 : blue-800
    shadowFilter = 'url(#currentShadow)';
  }

  // Determine the appropriate filter
  let filter = 'none';
  if (!started) {
    filter = 'url(#blur)';
  } else if (isLast) {
    filter = isDarkMode ? 'url(#ringDark)' : 'url(#ring)';
  } else {
    filter = shadowFilter;
  }

  return (
    <g data-row={row} data-col={col} data-game-grid>
      {/* Cell background rectangle */}
      <rect
        x={x}
        y={y}
        width={cellSize}
        height={cellSize}
        rx={cellRadius}
        ry={cellRadius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        filter={filter}
        className={cn(
          'transition-all duration-300 ease-out',
          started && 'cursor-pointer',
          started && !isInFound && 'hover:scale-105 active:scale-95'
        )}
        style={{
          transformOrigin: `${x + cellSize / 2}px ${y + cellSize / 2}px`,
          transformBox: 'fill-box'
        }}
      />

      {/* Hover effect rectangle (invisible but interactive) */}
      {started && !isInCurrent && !isInFound && (
        <rect
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          rx={cellRadius}
          ry={cellRadius}
          fill="transparent"
          stroke="transparent"
          className={cn(
            'cursor-pointer transition-all duration-200',
            isDarkMode ? 'hover:fill-[url(#hoverGradientDark)]' : 'hover:fill-[url(#hoverGradient)]'
          )}
          style={{
            transformOrigin: `${x + cellSize / 2}px ${y + cellSize / 2}px`,
            transformBox: 'fill-box'
          }}
        />
      )}

      {/* Cell text */}
      <text
        x={x + cellSize / 2}
        y={y + cellSize / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textFill}
        fontSize={fontInfo.fontSize * 14} // Adjusted font size calculation
        fontWeight="700"
        className={cn(
          fontInfo.className,
          'pointer-events-none transition-all duration-300 select-none',
          !started && 'filter-[url(#blur)]'
        )}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        {letter}
      </text>
    </g>
  );
};
