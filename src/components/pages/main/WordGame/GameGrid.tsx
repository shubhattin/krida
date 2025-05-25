import { useDrag } from '@use-gesture/react';
import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { FONT_INFO, type ScriptType } from '~/state/script_font_data';
import { type CellPosition } from './GameController';
import { cn } from '~/lib/utils';

type Props = {
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
  setCurrentSelection: Dispatch<SetStateAction<CellPosition[]>>;
  setFoundWords: Dispatch<SetStateAction<{ cells: CellPosition[]; word: string }[]>>;
  setCompleted: Dispatch<SetStateAction<boolean>>;
};

export const GameGrid = ({
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
  setCurrentSelection,
  setFoundWords,
  setCompleted
}: Props) => {
  const font_info = FONT_INFO[script];

  // helper to go from a cell index to its pixel center
  const getCenter = ({ row, col }: CellPosition) => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const parentRect = gridRef.current.getBoundingClientRect();
    const cell = gridRef.current.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (!cell) return { x: 0, y: 0 };
    const r = cell.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - parentRect.left,
      y: r.top + r.height / 2 - parentRect.top
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

  // same drag logic as before
  const bind = useDrag(
    ({ event, first, down, last }) => {
      event?.preventDefault();
      if (!started || completed) return;
      if (first) setCurrentSelection([]);
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
        if (currentSelection.length >= 2 && word_list.includes(word)) {
          setFoundWords((prev) => [...prev, { cells: [...currentSelection], word }]);
        }
        setCurrentSelection([]);
      }
    },
    { eventOptions: { passive: false } }
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [foundWords.length, word_list.length, started]);

  return (
    <div className="w-full">
      {/* Game Grid Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        {/* relative wrapper for grid + overlay */}
        <div className="relative">
          {/* Grid Header */}

          {/* Game Grid */}
          <div
            ref={gridRef}
            {...(started || !completed ? { ...bind() } : {})}
            className="relative z-10 mx-auto grid h-full w-full touch-none gap-1.5 select-none sm:gap-2 md:gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              maxWidth: 'min(100%, min(90vw, 450px))'
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
      style={{
        fontSize: `${fontInfo.fontSize}rem`
      }}
      className={cn(
        fontInfo.clasName,
        !started && 'blur-sm',
        started && 'cursor-pointer',
        'flex items-center justify-center rounded-xl text-center font-bold sm:rounded-2xl',
        'aspect-square border-2 p-1 sm:p-2 md:p-3',
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
