'use client';

import { useState, useRef, useEffect } from 'react';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs, type word_game_msgs } from './word_game_msgs';
import { GameContoller, type CellPosition, type Selection } from './GameController';
import { GameBottom } from './BottomSection';
import { GameGrid } from './GameGrid';
import { GameHelp } from './GameHelp';
import { useAtom } from 'jotai';
import { script_atom } from '~/state/main.state';

interface WordGameProps {
  grid_data: string[][];
  dims: number[];
  word_list: string[];
  title: string;
  initial_script_data: {
    word_msgs: typeof word_game_msgs;
    title: string;
    grid_data: string[][];
  };
}

export default function WordGame({
  grid_data,
  dims,
  word_list,
  title,
  initial_script_data
}: WordGameProps) {
  const [script] = useAtom(script_atom);
  const [gridData, setGridData] = useState(initial_script_data.grid_data);
  const [title_tr, setTitle] = useState(initial_script_data.title);

  const [wordMsgs, setWordMsgs] = useState(initial_script_data.word_msgs);

  // transliteration
  useEffect(() => {
    (async () => {
      setGridData(
        await Promise.all(
          grid_data.map(async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script!))
        )
      );
      setTitle(await lipi_parivartak(title, DEFAULT_DATA_SCRIPT, script!));

      setWordMsgs({
        ...(await get_transliterated_word_game_msgs(script!))
      });
    })();
  }, [script]);

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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        {/* Header Section */}
        <div className="mb-8 space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 text-white shadow-lg">
            <span className="text-sm font-semibold tracking-wide uppercase">Hint</span>
          </div>
          <h1 className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl lg:text-5xl dark:from-slate-100 dark:to-slate-300">
            {title_tr}
          </h1>
        </div>

        {/* Main Game Container */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Game Controls & Progress - Left Sidebar on large screens, top on mobile */}
          <div className="order-2 space-y-6 lg:order-1 lg:col-span-3">
            <div className="space-y-4 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:p-6 dark:border-slate-700 dark:bg-slate-800">
                <GameContoller
                  started={started}
                  completed={completed}
                  seconds={seconds}
                  timerRef={timerRef}
                  setCompleted={setCompleted}
                  setSeconds={setSeconds}
                  setStarted={setStarted}
                  wordMsgs={wordMsgs}
                  setFoundWords={setFoundWords}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:p-6 dark:border-slate-700 dark:bg-slate-800">
                <GameBottom
                  completed={completed}
                  foundWords={foundWords}
                  seconds={seconds}
                  started={started}
                  title={title}
                  wordMsgs={wordMsgs}
                  word_list={word_list}
                />
              </div>
            </div>
          </div>

          {/* Game Grid - Center */}
          <div className="order-1 flex justify-center lg:order-2 lg:col-span-6">
            <div className="w-full max-w-lg">
              <GameGrid
                cols={cols}
                rows={rows}
                completed={completed}
                currentSelection={currentSelection}
                foundWords={foundWords}
                gridData={gridData}
                grid_data={grid_data}
                gridRef={gridRef}
                script={script!}
                setCurrentSelection={setCurrentSelection}
                setFoundWords={setFoundWords}
                started={started}
                word_list={word_list}
                timerRef={timerRef}
                setCompleted={setCompleted}
              />
            </div>
          </div>

          {/* Help Section - Right Sidebar on large screens, bottom on mobile */}
          <div className="order-3 lg:col-span-3">
            <div className="lg:sticky lg:top-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <GameHelp />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
