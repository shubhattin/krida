'use client';

import { useState, useRef, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notoSansDevanagari } from '@/components/fonts';
import { MdReplay } from 'react-icons/md';
import { IoShareSocialOutline } from 'react-icons/io5';
import Icon from '~/tools/Icon';
import { BrainIcon } from '~/components/icons';
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionTrigger
} from '~/components/ui/accordion';

interface WordGameProps {
  grid_data: string[][];
  dims: number[];
  word_list: string[];
  title: string;
}

type CellPosition = { row: number; col: number };
type Selection = { cells: CellPosition[]; word: string };

export default function WordGame({ grid_data, dims, word_list, title }: WordGameProps) {
  const [started, setStarted] = useState(false);
  const [rows, cols] = dims;
  const gridRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // store the grid's bbox so we can compute actual pixel centers
  const [gridBBox, setGridBBox] = useState<DOMRect | null>(null);

  const [currentSelection, setCurrentSelection] = useState<CellPosition[]>([]);
  const [foundWords, setFoundWords] = useState<Selection[]>([]);

  // helpers for hit-testing and coloring
  const isCellInCurrentSelection = (r: number, c: number) =>
    currentSelection.some((cell) => cell.row === r && cell.col === c);
  const isCellInFoundWords = (r: number, c: number) =>
    foundWords.some((sel) => sel.cells.some((cell) => cell.row === r && cell.col === c));
  const getWordFromSelection = (sel: CellPosition[]) =>
    sel.map((cell) => grid_data[cell.row][cell.col]).join('');

  // re-compute bbox on mount & on resize
  useEffect(() => {
    if (!gridRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!gridRef.current) return;
      setGridBBox(gridRef.current.getBoundingClientRect());
    });
    ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, []);

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

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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

  // Timer effect
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
    <>
      <div className="flex flex-col items-center justify-center">
        <div className="mb-1.5 rounded-md bg-emerald-300 px-4 font-semibold text-gray-600 dark:bg-green-400 dark:text-slate-800">
          Hint
        </div>
        <span className="text-2xl font-bold">{title}</span>
      </div>
      <div className="flex flex-col items-center gap-6 p-4">
        <div className="flex w-full max-w-md items-center justify-center">
          {!started && (
            <button
              onClick={handleStart}
              className={cn(
                'group flex items-center justify-center space-x-2 rounded-xl px-2 py-0.5 pt-2 font-semibold',
                'border-2 border-red-600 hover:border-blue-700 dark:border-orange-500 hover:dark:border-pink-500'
              )}
            >
              <Icon
                src={BrainIcon}
                className="-mt-1.5 text-2xl text-green-500 group-hover:text-emerald-600 dark:text-green-400"
              />
              <span className="text-2xl text-amber-500 group-hover:text-yellow-600 dark:text-amber-300 group-hover:dark:text-yellow-400">
                क्रीड
              </span>
            </button>
          )}
          {completed && (
            <button
              onClick={handleStart}
              className={cn(
                'flex items-center justify-center font-semibold',
                'group space-x-2 rounded-xl border-2 px-2 py-0.5'
              )}
            >
              <MdReplay className="text-2xl" />
              <span className="text-2xl text-sky-600 group-hover:text-sky-700 dark:text-sky-300 group-hover:dark:text-sky-400">
                पुनः
              </span>
            </button>
          )}

          <div className="text-xl font-semibold">
            {started && !completed && (
              <span
                className={cn(
                  'font-mono',
                  completed
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              >
                {formatTime(seconds)}
              </span>
            )}
          </div>
        </div>

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
              {grid_data.map((row, ri) =>
                row.map((letter, ci) => {
                  const isInCurrent = isCellInCurrentSelection(ri, ci);
                  const isInFound = isCellInFoundWords(ri, ci);
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      data-row={ri}
                      data-col={ci}
                      className={cn(
                        notoSansDevanagari.className,
                        !started && 'blur-sm',
                        'flex items-center justify-center rounded-2xl text-center text-xl font-bold',
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

        <div className="w-full max-w-md">
          {started && !completed && (
            <h3 className="mb-2 text-lg font-semibold text-stone-800 dark:text-stone-200">
              <span className="mr-1.5">लब्धशब्दानि :</span>
              <span
                className={cn(
                  foundWords.length === word_list.length
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-blue-700 dark:text-blue-400'
                )}
              >
                {foundWords.length}/{word_list.length}
              </span>
            </h3>
          )}

          {completed && (
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                क्रीडनाय गृहीतकालम् - <span className="font-mono">{formatTime(seconds)}</span>
              </p>
              {typeof navigator !== 'undefined' && navigator.share && (
                // {true && (
                <Button
                  onClick={async () => {
                    if (navigator?.share) {
                      await navigator
                        .share({
                          title: `${title} - पदावलीशब्दक्रीडनम्`,
                          text:
                            `I completed '${title}' in ${formatTime(seconds)} !\n\nTry it out at ` +
                            window.location.origin
                        })
                        .catch((err) => console.log('Error sharing:', err));
                    }
                  }}
                  className="m-0 mt-1.5 gap-1.5 bg-green-600 px-1.5 py-1 text-lg text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                >
                  <IoShareSocialOutline className="text-lg" />
                  सन्दातु
                </Button>
              )}
            </div>
          )}
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>How to Play ?</AccordionTrigger>
            <AccordionContent>
              After Starting the game select the cells to make a word combination.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}
