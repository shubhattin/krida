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
    <>
      <div className="flex flex-col items-center justify-center">
        <div className="mb-1.5 rounded-md bg-emerald-300 px-4 font-semibold text-gray-600 dark:bg-green-400 dark:text-slate-800">
          Hint
        </div>
        <span className="text-2xl font-bold">{title_tr}</span>
      </div>
      <div className="flex flex-col items-center gap-6 p-4">
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
      <GameHelp />
    </>
  );
}
