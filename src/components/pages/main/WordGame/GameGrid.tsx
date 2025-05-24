import { useDrag } from '@use-gesture/react';
import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Card } from '~/components/ui/card';
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
    <Card className="m-0 p-2 sm:p-2.5">
      {/* relative wrapper for grid + overlay */}
      <div className="relative">
        {/* your grid */}
        <div
          ref={gridRef}
          {...bind()}
          className="relative z-10 grid h-full w-full touch-none gap-4 select-none sm:gap-5"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`
          }}
        >
          {gridData.map((row, ri) =>
            row.map((letter, ci) => {
              const isInCurrent = isCellInCurrentSelection(ri, ci);
              const isInFound = isCellInFoundWords(ri, ci);
              return (
                <div
                  key={`${ri}-${ci}`}
                  data-row={ri}
                  data-col={ci}
                  style={{
                    fontSize: `${font_info.fontSize}rem`
                  }}
                  className={cn(
                    font_info.clasName,
                    !started && 'blur-sm',
                    'flex items-center justify-center rounded-2xl text-center font-bold',
                    'aspect-square border-2 border-gray-200 p-1 dark:border-gray-700',
                    'transform transition-transform duration-300',
                    isInFound &&
                      'border-green-400 bg-green-200 dark:border-green-600 dark:bg-green-900',
                    isInCurrent &&
                      !isInFound &&
                      'border-blue-400 bg-blue-200 dark:border-blue-600 dark:bg-blue-900',
                    isInCurrent &&
                      !isInFound &&
                      currentSelection.length !== 0 &&
                      currentSelection.at(-1)?.row === ri &&
                      currentSelection.at(-1)?.col === ci &&
                      'scale-115',
                    !isInCurrent && !isInFound && 'bg-white dark:bg-gray-800'
                  )}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>

        {/* overlay SVG for trails */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* already found words in green */}
          {foundWords.map((sel, i) => (
            <polyline
              key={i}
              points={buildPoints(sel.cells)}
              fill="none"
              className="stroke-green-400 dark:stroke-green-500"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* current drag in blue */}
          {currentSelection.length > 1 && (
            <polyline
              points={buildPoints(currentSelection)}
              fill="none"
              className="stroke-blue-400 dark:stroke-blue-500"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </Card>
  );
};
