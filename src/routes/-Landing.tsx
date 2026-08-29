'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  BookOpen,
  Play,
  ArrowRight,
  ExternalLink,
  Book,
  Music,
  Globe,
  Languages,
  Trophy,
  ChevronRight,
  Code2,
  Grid3X3
} from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import { Link } from '@tanstack/react-router';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GameAppIcon } from '@/components/GameAppIcon';

// ─── Padavali Mini Demo Constants ─────────────────────────
type CellPos = { row: number; col: number };

const MOCK_GRID = [
  ['ज्ञा', 'नं', 'म', 'ङ्ग', 'ल'],
  ['सं', 'स्कृ', 'प', 'त', 'म'],
  ['दे', 'व', 'लो', 'दा', 'क'],
  ['भा', 'षा', 'व', 'रा', 'म'],
  ['ह', 'रिः', 'ली', 'ला', 'क']
];

const GRID_ROWS = MOCK_GRID.length;
const GRID_COLS = MOCK_GRID[0]!.length;

// ─── Padajala Mini Demo Constants ─────────────────────────
// A simplified crossword shape for visual preview
// 1 = filled cell, 0 = empty
const CROSSWORD_GRID = [
  [0, 0, 0, 0, 0], // Row 0
  [0, 1, 1, 1, 1], // Row 1: . Y O G A
  [0, 0, 0, 1, 0], // Row 2: . . . I .
  [0, 0, 0, 1, 0], // Row 3: . . . T .
  [1, 1, 1, 1, 0] // Row 4: V E D A .
];

const CROSSWORD_LETTERS = [
  ['', '', '', '', ''],
  ['', 'Y', 'O', 'G', 'A'],
  ['', '', '', 'I', ''],
  ['', '', '', 'T', ''],
  ['V', 'E', 'D', 'A', '']
];

// ─── Script Samples ───────────────────────────────────────
const SCRIPT_SAMPLES = [
  { script: 'Devanagari', text: 'पदावली' },
  { script: 'Telugu', text: 'పదావళి' },
  { script: 'Kannada', text: 'ಪದಾವಳಿ' },
  { script: 'Gujarati', text: 'પદાવલી' },
  { script: 'Bengali', text: 'পদাবলী' },
  { script: 'Odia', text: 'ପଦାବଳୀ' },
  { script: 'Tamil', text: 'பதாவலி' }
];

// ─── Game Card Config ─────────────────────────────────────
export const GAMES = [
  {
    id: 'padavali' as const,
    name: 'Padāvalī',
    subtitle: 'Word Search',
    description: 'Find hidden Sanskrit words by dragging across a grid of letters.',
    playHref: '/padavali',
    puzzlesHref: '/padavali/puzzles',
    gradient: {
      from: 'from-blue-500',
      to: 'to-indigo-600',
      text: 'from-blue-600 via-blue-500 to-indigo-600',
      textDark: 'dark:from-blue-400 dark:via-blue-300 dark:to-indigo-400',
      glow: 'blue',
      border:
        'border-blue-200/40 hover:border-blue-400/60 dark:border-blue-800/40 dark:hover:border-blue-600/60',
      bg: 'bg-blue-50/30 dark:bg-blue-950/20',
      shadowColor: 'shadow-blue-500/20'
    }
  },
  {
    id: 'padajala' as const,
    name: 'Padajāla',
    subtitle: 'Crossword',
    description: 'Solve Sanskrit crossword puzzles and expand your vocabulary.',
    playHref: '/padajala',
    puzzlesHref: '/padajala/puzzles',
    gradient: {
      from: 'from-amber-500',
      to: 'to-orange-600',
      text: 'from-amber-600 via-orange-500 to-orange-600',
      textDark: 'dark:from-amber-400 dark:via-orange-300 dark:to-orange-400',
      glow: 'amber',
      border:
        'border-amber-200/40 hover:border-amber-400/60 dark:border-amber-800/40 dark:hover:border-amber-600/60',
      bg: 'bg-amber-50/30 dark:bg-amber-950/20',
      shadowColor: 'shadow-amber-500/20'
    }
  }
] as const;

// ─── Demo Words for Padavali Animation ─────────────────────
const DEMO_WORDS: { text: string; path: CellPos[] }[] = [
  {
    text: 'पदावली',
    path: [
      { row: 1, col: 2 },
      { row: 2, col: 3 },
      { row: 3, col: 2 },
      { row: 4, col: 2 }
    ]
  },
  {
    text: 'ज्ञानं',
    path: [
      { row: 0, col: 0 },
      { row: 0, col: 1 }
    ]
  },
  {
    text: 'भाषा',
    path: [
      { row: 3, col: 0 },
      { row: 3, col: 1 }
    ]
  },
  {
    text: 'हरिः',
    path: [
      { row: 4, col: 0 },
      { row: 4, col: 1 }
    ]
  },
  {
    text: 'देव',
    path: [
      { row: 2, col: 0 },
      { row: 2, col: 1 }
    ]
  }
];

/** Random adjacent path used for occasional "miss" demos (mirrors GameGrid). */
function generateRandomPath(rows: number, cols: number): CellPos[] {
  for (let attempt = 0; attempt < 20; attempt++) {
    const startRow = Math.floor(Math.random() * rows);
    const startCol = Math.floor(Math.random() * cols);
    const path: CellPos[] = [{ row: startRow, col: startCol }];
    const targetLength = Math.floor(Math.random() * 3) + 2;
    let current = { row: startRow, col: startCol };
    let success = true;

    for (let step = 1; step < targetLength; step++) {
      const neighbors: CellPos[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = current.row + dr;
          const nc = current.col + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (path.some((p) => p.row === nr && p.col === nc)) continue;
          neighbors.push({ row: nr, col: nc });
        }
      }
      if (neighbors.length === 0) {
        success = false;
        break;
      }
      const next = neighbors[Math.floor(Math.random() * neighbors.length)]!;
      path.push(next);
      current = next;
    }
    if (success && path.length >= 2) return path;
  }
  return [
    { row: 0, col: 0 },
    { row: 0, col: 1 }
  ];
}

function cellsEqual(a: CellPos, b: CellPos) {
  return a.row === b.row && a.col === b.col;
}

function isCellInPath(path: CellPos[], row: number, col: number) {
  return path.some((c) => c.row === row && c.col === col);
}

// ─── Padavali Mini Grid Preview ───────────────────────────
// Mirrors GameGrid idle-demo: hand emoji traces a path, blue selection →
// green success / red miss, SVG trail, found words persist.
export function PadavaliMiniPreview() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [demoPath, setDemoPath] = useState<CellPos[]>([]);
  const [demoState, setDemoState] = useState<'idle' | 'selecting' | 'success' | 'fail'>('idle');
  const [handPos, setHandPos] = useState<CellPos | null>(null);
  const [lastHandPos, setLastHandPos] = useState<CellPos | null>(null);
  const [foundWords, setFoundWords] = useState<{ text: string; path: CellPos[] }[]>([]);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [trailPoints, setTrailPoints] = useState<{
    found: Record<string, string>;
    demo: string;
  }>({ found: {}, demo: '' });

  const updateHandPos = (pos: CellPos | null) => {
    setHandPos(pos);
    if (pos) setLastHandPos(pos);
  };

  // Keep SVG trails accurate when the card resizes or paths change
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const getCenter = ({ row, col }: CellPos) => {
      const cell = el.querySelector<HTMLElement>(
        `[data-mini-row="${row}"][data-mini-col="${col}"]`
      );
      if (!cell) return { x: 0, y: 0 };
      const parentRect = el.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      return {
        x: cellRect.left + cellRect.width / 2 - parentRect.left,
        y: cellRect.top + cellRect.height / 2 - parentRect.top
      };
    };

    const buildPoints = (cells: CellPos[]) =>
      cells
        .map((c) => {
          const { x, y } = getCenter(c);
          return `${x},${y}`;
        })
        .join(' ');

    const sync = () => {
      setTrailPoints({
        found: Object.fromEntries(foundWords.map((word) => [word.text, buildPoints(word.path)])),
        demo: buildPoints(demoPath)
      });
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [demoPath, foundWords]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    let wordCursor = 0;
    let completedFinds = 0;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, ms);
      });

    const tracePath = async (path: CellPos[]) => {
      setDemoState('selecting');
      for (let i = 0; i < path.length; i++) {
        if (!isMounted) return;
        setDemoPath(path.slice(0, i + 1));
        updateHandPos(path[i]!);
        await wait(560);
      }
    };

    const startCycle = async () => {
      if (!isMounted) return;

      // Idle beat — keep hand visible so it springs to the next start
      setDemoPath([]);
      setDemoState('idle');
      setActiveLabel(null);
      await wait(1100);
      if (!isMounted) return;

      // ~30% of cycles after the first find: a short miss (like GameGrid)
      const isMiss = Math.random() < 0.3 && completedFinds > 0;
      if (isMiss) {
        const missPath = generateRandomPath(GRID_ROWS, GRID_COLS);
        setActiveLabel(null);
        await tracePath(missPath);
        if (!isMounted) return;
        setDemoState('fail');
        await wait(1200);
        if (!isMounted) return;
        startCycle();
        return;
      }

      const idx = wordCursor % DEMO_WORDS.length;
      // Fresh lap — clear persisted greens so the loop can replay
      if (idx === 0 && wordCursor > 0) {
        completedFinds = 0;
        setFoundWords([]);
      }
      const word = DEMO_WORDS[idx]!;
      wordCursor += 1;

      setActiveLabel(word.text);
      await tracePath(word.path);
      if (!isMounted) return;

      setDemoState('success');
      completedFinds += 1;
      setFoundWords((prev) => {
        if (prev.some((w) => w.text === word.text)) return prev;
        return [...prev, word];
      });
      await wait(1600);
      if (!isMounted) return;
      startCycle();
    };

    startCycle();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const displayPos = handPos ?? lastHandPos;
  const isHandVisible = !!handPos;
  const wordsFound = foundWords.length;
  const trailStroke =
    demoState === 'success'
      ? {
          glow: 'stroke-emerald-300 dark:stroke-emerald-400',
          main: 'stroke-emerald-500 dark:stroke-emerald-400'
        }
      : demoState === 'fail'
        ? {
            glow: 'stroke-red-300 dark:stroke-red-400',
            main: 'stroke-red-500 dark:stroke-red-400'
          }
        : {
            glow: 'stroke-blue-300 dark:stroke-blue-400',
            main: 'stroke-blue-500 dark:stroke-blue-400'
          };

  return (
    <div className="relative rounded-2xl border border-slate-200/40 bg-slate-100/40 p-4.5 dark:border-slate-800/40 dark:bg-slate-950/20">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Live Demo
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AnimatePresence mode="wait">
            {activeLabel && demoState !== 'idle' ? (
              <motion.span
                key={activeLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs',
                  demoState === 'fail'
                    ? 'border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                    : demoState === 'success'
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                )}
              >
                {activeLabel}
              </motion.span>
            ) : null}
          </AnimatePresence>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-xs',
              wordsFound > 0
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
            )}
          >
            {wordsFound}/{DEMO_WORDS.length}
          </span>
        </div>
      </div>

      {/* Grid + hand + trails — SVG under opaque cells (like GameGrid) */}
      <div className="relative">
        {/* Trails sit under the grid so letters stay readable */}
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          {foundWords.map((word) => {
            // Skip the active word while its live demo trail is drawn
            if (word.path.length < 2) return null;
            if (demoPath.length > 1 && word.text === activeLabel) return null;
            return (
              <g key={word.text}>
                <polyline
                  points={trailPoints.found[word.text] ?? ''}
                  fill="none"
                  className="stroke-emerald-300 dark:stroke-emerald-400"
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.4}
                />
                <polyline
                  points={trailPoints.found[word.text] ?? ''}
                  fill="none"
                  className="stroke-emerald-500 dark:stroke-emerald-400"
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {demoPath.length > 1 && (
            <g>
              <polyline
                points={trailPoints.demo}
                fill="none"
                className={trailStroke.glow}
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.42}
              />
              <polyline
                points={trailPoints.demo}
                fill="none"
                className={trailStroke.main}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </svg>

        <div
          ref={gridRef}
          className="relative z-10 grid grid-cols-5 gap-2.5"
          style={{ gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
        >
          {MOCK_GRID.map((rowArr, rIdx) =>
            rowArr.map((letter, cIdx) => {
              const inDemo = isCellInPath(demoPath, rIdx, cIdx);
              const inFound = foundWords.some((w) => isCellInPath(w.path, rIdx, cIdx));
              const isLast =
                inDemo &&
                demoPath.length > 0 &&
                cellsEqual(demoPath[demoPath.length - 1]!, { row: rIdx, col: cIdx });

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  data-mini-row={rIdx}
                  data-mini-col={cIdx}
                  className={cn(
                    'relative z-10 flex aspect-square items-center justify-center rounded-xl border text-base font-extrabold transition-all duration-300',
                    // Solid base (keeps trails under glyphs) + neon rim/glow on active states
                    'border-slate-200 bg-linear-to-br from-white to-slate-50 text-slate-800 shadow-xs',
                    'dark:border-slate-700 dark:from-slate-800 dark:to-slate-950 dark:text-slate-200',
                    inFound &&
                      !(inDemo && demoState === 'selecting') && [
                        // No scale — keeps H/V gap open so trails stay visible
                        'border-emerald-400 bg-linear-to-br from-emerald-50 to-green-100 text-emerald-700',
                        'shadow-[0_0_14px_rgba(52,211,153,0.45)] ring-1 ring-emerald-300/70',
                        'dark:border-emerald-400/90 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-200',
                        'dark:shadow-[0_0_18px_rgba(52,211,153,0.5)] dark:ring-emerald-400/50'
                      ],
                    inDemo &&
                      demoState === 'selecting' && [
                        'border-blue-400 bg-linear-to-br from-sky-50 to-blue-100 text-blue-700',
                        'shadow-[0_0_14px_rgba(96,165,250,0.5)] ring-1 ring-blue-300/70',
                        'dark:border-blue-400/90 dark:from-blue-950 dark:to-indigo-950 dark:text-blue-200',
                        'dark:shadow-[0_0_18px_rgba(96,165,250,0.55)] dark:ring-blue-400/50'
                      ],
                    inDemo &&
                      demoState === 'success' && [
                        'border-emerald-400 bg-linear-to-br from-emerald-50 to-green-100 text-emerald-700',
                        'shadow-[0_0_16px_rgba(52,211,153,0.55)] ring-1 ring-emerald-300/80',
                        'dark:border-emerald-400 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-100',
                        'dark:shadow-[0_0_20px_rgba(52,211,153,0.6)] dark:ring-emerald-400/60'
                      ],
                    inDemo &&
                      demoState === 'fail' && [
                        'border-red-400 bg-linear-to-br from-red-50 to-rose-100 text-red-700',
                        'shadow-[0_0_14px_rgba(248,113,113,0.45)] ring-1 ring-red-300/70',
                        'dark:border-red-400/90 dark:from-red-950 dark:to-rose-950 dark:text-red-200',
                        'dark:shadow-[0_0_18px_rgba(248,113,113,0.5)] dark:ring-red-400/50'
                      ],
                    isLast &&
                      demoState === 'selecting' &&
                      'ring-2 ring-blue-300/80 dark:ring-blue-400/70'
                  )}
                >
                  <span
                    className={cn(
                      'relative z-10',
                      (inDemo || inFound) && 'drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]'
                    )}
                  >
                    {letter}
                  </span>
                </div>
              );
            })
          )}

          {/* Hand pointer — above cells + trails */}
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              zIndex: 35,
              pointerEvents: 'none'
            }}
            initial={false}
            animate={{
              left: displayPos ? `${((displayPos.col + 0.5) / GRID_COLS) * 100}%` : '50%',
              top: displayPos ? `${((displayPos.row + 0.5) / GRID_ROWS) * 100}%` : '50%',
              opacity: isHandVisible ? 1 : 0,
              scale: isHandVisible ? 1 : 0.8
            }}
            transition={{
              left: { type: 'spring', stiffness: 100, damping: 15 },
              top: { type: 'spring', stiffness: 100, damping: 15 },
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
            className="pointer-events-none -translate-x-1/2 translate-y-[-18%] text-lg drop-shadow-md select-none sm:text-2xl"
          >
            👆
          </motion.div>
        </div>
      </div>

      {/* Hint under the grid */}
      <p className="mt-2.5 text-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
        Drag across letters to find words
      </p>
    </div>
  );
}

// ─── Padajala Mini Crossword Preview ──────────────────────
export function PadajalaMiniPreview() {
  const [filledCount, setFilledCount] = useState(0);
  const totalCells = CROSSWORD_GRID.flat().filter(Boolean).length;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isMounted = true;

    const runCycle = async () => {
      if (!isMounted) return;
      setFilledCount(0);
      await new Promise((r) => {
        timer = setTimeout(r, 1200);
      });
      if (!isMounted) return;

      for (let i = 1; i <= totalCells; i++) {
        setFilledCount(i);
        await new Promise((r) => {
          timer = setTimeout(r, 320);
        });
        if (!isMounted) return;
      }

      await new Promise((r) => {
        timer = setTimeout(r, 3000);
      });
      if (!isMounted) return;
      runCycle();
    };

    runCycle();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [totalCells]);

  let cellIndex = 0;

  // Track words found
  // - 4 cells: YOGA completed
  // - 10 cells: GITA and VEDA completed
  let wordsFound = 0;
  if (filledCount >= 4) wordsFound += 1;
  if (filledCount >= 10) wordsFound += 2;

  const isComplete = wordsFound === 3;

  return (
    <div className="relative rounded-2xl border border-slate-200/40 bg-slate-100/40 p-4.5 dark:border-slate-800/40 dark:bg-slate-950/20">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={`size-1.5 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Preview
          </span>
        </div>
        <div
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-xs ${
            isComplete
              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'
          }`}
        >
          {wordsFound}/3 words found
        </div>
      </div>

      {/* Crossword Grid */}
      <div className="grid grid-cols-5 gap-2">
        {CROSSWORD_GRID.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) {
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className="aspect-square rounded-xl border border-slate-200/60 bg-slate-200/40 dark:border-slate-800/50 dark:bg-slate-950/90"
                />
              );
            }

            const currentIndex = cellIndex++;
            const isFilled = currentIndex < filledCount;
            const letter = CROSSWORD_LETTERS[rIdx]?.[cIdx] || '';

            // Color green as soon as the word containing the cell is completed
            let isWordComplete = false;
            if (currentIndex >= 0 && currentIndex <= 3) {
              // YOGA is complete at filledCount >= 4
              isWordComplete = filledCount >= 4;
            } else if (currentIndex === 4 || currentIndex === 5) {
              // GITA is complete at filledCount >= 10
              isWordComplete = filledCount >= 10;
            } else if (currentIndex >= 6 && currentIndex <= 9) {
              // VEDA (and GITA) are complete at filledCount >= 10
              isWordComplete = filledCount >= 10;
            }

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl border text-sm font-extrabold transition-colors duration-300',
                  !isFilled &&
                    'border-slate-200 bg-white/70 text-slate-300 dark:border-slate-800/80 dark:bg-slate-900/40 dark:text-slate-600',
                  isFilled &&
                    !isWordComplete && [
                      'border-amber-400 bg-linear-to-br from-amber-50 to-orange-100 text-amber-700',
                      'shadow-[0_0_12px_rgba(251,191,36,0.4)] ring-1 ring-amber-300/60',
                      'dark:border-amber-400/90 dark:from-amber-950 dark:to-orange-950 dark:text-amber-200',
                      'dark:shadow-[0_0_16px_rgba(251,191,36,0.45)] dark:ring-amber-400/45'
                    ],
                  isFilled &&
                    isWordComplete && [
                      'border-emerald-400 bg-linear-to-br from-emerald-50 to-green-100 text-emerald-700',
                      'shadow-[0_0_14px_rgba(52,211,153,0.45)] ring-1 ring-emerald-300/70',
                      'dark:border-emerald-400 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-200',
                      'dark:shadow-[0_0_18px_rgba(52,211,153,0.5)] dark:ring-emerald-400/50'
                    ]
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isFilled ? (
                    <motion.span
                      key={`letter-${rIdx}-${cIdx}`}
                      initial={{ scale: 0.12, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.35, opacity: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 560,
                        damping: 16,
                        mass: 0.65
                      }}
                      className="inline-block origin-center drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]"
                    >
                      {letter}
                    </motion.span>
                  ) : (
                    <motion.span
                      key={`dot-${rIdx}-${cIdx}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.12 }}
                      className="inline-block"
                    >
                      ·
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Game Showcase Card ───────────────────────────────────
export function GameShowcaseCard({ game, index }: { game: (typeof GAMES)[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 + index * 0.15, ease: 'easeOut' }}
      className="group relative"
    >
      {/* Glow effect behind card */}
      <div
        className={`absolute -inset-1 rounded-3xl bg-linear-to-br ${game.gradient.from} ${game.gradient.to} opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-15`}
      />

      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl border ${game.gradient.border} bg-white/60 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl dark:bg-slate-900/50`}
      >
        {/* Card header with icon + title */}
        <div className="flex items-start gap-3.5 p-5 pb-3">
          <GameAppIcon game={game.id} name={game.name} size="lg" />

          <div className="min-w-0 flex-1">
            <h3
              className={`bg-linear-to-r ${game.gradient.text} ${game.gradient.textDark} bg-clip-text text-xl font-black tracking-tight text-transparent`}
            >
              {game.name}
            </h3>
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {game.subtitle}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {game.description}
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-2 px-5 pb-4">
          <Button
            render={
              <Link
                to={game.playHref}
                className="flex items-center justify-center gap-1.5 font-bold"
              />
            }
            nativeButton={false}
            size="sm"
            className={`flex-1 bg-linear-to-r ${game.gradient.from} ${game.gradient.to} px-4 py-2.5 text-xs text-white shadow-md ${game.gradient.shadowColor} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <Play className="size-3.5 fill-white" />
            Play Now
            <ArrowRight className="size-3.5" />
          </Button>

          <Button
            render={
              <Link
                to={game.puzzlesHref}
                className="flex items-center justify-center gap-1.5 font-semibold"
              />
            }
            nativeButton={false}
            size="sm"
            variant="outline"
            className="flex-1 border-slate-200/80 bg-white/50 px-4 py-2.5 text-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/80 dark:border-slate-700/80 dark:bg-slate-800/50 dark:hover:bg-slate-800/80"
          >
            <BookOpen className="size-3.5" />
            Puzzles
          </Button>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-slate-200/50 dark:border-slate-700/50" />

        {/* Mini preview */}
        <div className="p-4 pt-3">
          {game.id === 'padavali' ? <PadavaliMiniPreview /> : <PadajalaMiniPreview />}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Landing Page ────────────────────────────────────
export default function LandingPage() {
  const [scriptIndex, setScriptIndex] = useState(0);

  // Script carousel auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setScriptIndex((prev) => (prev + 1) % SCRIPT_SAMPLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="relative left-1/2 min-h-screen w-screen max-w-[100vw] -translate-x-1/2 overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* Decorative Radial Background Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-125 w-125 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute top-1/3 right-1/4 h-150 w-150 rounded-full bg-purple-400/10 blur-3xl dark:bg-purple-500/10" />
        <div className="absolute -bottom-20 left-1/3 h-125 w-125 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
        <div className="absolute top-1/2 right-1/3 h-100 w-100 rounded-full bg-amber-400/8 blur-3xl dark:bg-amber-500/8" />
      </div>

      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-10 md:pt-24 md:pb-16">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="space-y-6 text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-blue-50/50 px-4 py-1.5 text-xs font-semibold text-blue-600 backdrop-blur-sm dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-400">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-500 dark:text-amber-400" />
                Sanskrit Learning Refined
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="mx-auto max-w-3xl bg-linear-to-r from-slate-900 via-blue-700 to-indigo-600 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl md:text-7xl dark:from-white dark:via-blue-300 dark:to-indigo-400"
              variants={itemVariants}
            >
              Learn Sanskrit{' '}
              <span className="bg-linear-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-500">
                Through Games
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl dark:text-slate-300"
              variants={itemVariants}
            >
              Discover the elegance and depth of Sanskrit with interactive word puzzles and
              crosswords. Switch instantly across 6+ Indian scripts and build your vocabulary
              dynamically.
            </motion.p>

            {/* Scripts badge */}
            <motion.div className="flex items-center justify-center gap-3" variants={itemVariants}>
              <Languages className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports <strong>Devanagari, Telugu, Kannada, Gujarati, Bengali, and Odia</strong>{' '}
                with real-time transliteration.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Game Cards Section */}
      <section className="relative px-4 pb-16 md:pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {GAMES.map((game, index) => (
              <GameShowcaseCard key={game.id} game={game} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Script Multi-transliteration Showcase Section */}
      <section className="border-y border-slate-200/50 bg-slate-100/50 py-10 dark:border-slate-800/50 dark:bg-slate-900/30">
        <div className="mx-auto max-w-4xl space-y-6 px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
            <Globe className="h-3.5 w-3.5" />
            Script Agnostic Engine
          </div>
          <h2 className="text-2xl font-bold md:text-3xl">Play in your native Indian Script</h2>
          <p className="mx-auto max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Both games use real-time transliteration. See the word{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              &quot;Padavali&quot;
            </span>{' '}
            change instantly:
          </p>

          <div className="relative flex justify-center py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={scriptIndex}
                className="flex min-w-50 flex-col items-center gap-1 rounded-2xl border border-slate-200/60 bg-white px-8 py-5 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/80"
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                  {SCRIPT_SAMPLES[scriptIndex].text}
                </span>
                <span className="mt-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                  {SCRIPT_SAMPLES[scriptIndex].script} Script
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {SCRIPT_SAMPLES.map((sample, idx) => (
              <button
                key={sample.script}
                onClick={() => setScriptIndex(idx)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  scriptIndex === idx
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {sample.script}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl space-y-12 text-center">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Features Crafted For Learning
            </h2>
            <p className="mx-auto max-w-xl text-slate-500 dark:text-slate-400">
              Two unique game modes combined with powerful language tools — designed to build deep
              vocabulary retention.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white/40 p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Languages className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Multiple Scripts
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Play in the script you read best — Devanagari, Telugu, Kannada, Gujarati, Bengali,
                or Odia.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white/40 p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                Puzzles
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Browse and play from our full collection of word search and crossword puzzles.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white/40 p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                New Challenges
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Fresh puzzles every week — beat your personal time scores and learn Sanskrit
                consistently.
              </p>
            </div>

            {/* Feature 4 — New for Crossword */}
            <div className="group relative rounded-2xl border border-slate-200/60 bg-white/40 p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Grid3X3 className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                Two Game Modes
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Word search for pattern recognition, crossword for deep vocabulary — two ways to
                master Sanskrit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative px-4 pb-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/50 bg-white/40 p-8 shadow-xl dark:border-slate-800/50 dark:bg-slate-900/40">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
            {[
              { number: '20k+', label: 'Games Played', icon: Trophy },
              { number: '8+', label: 'Indian Scripts', icon: Globe },
              { number: '2', label: 'Game Modes', icon: Grid3X3 },
              { number: '∞', label: 'Learning Fun', icon: Sparkles },
              { number: '100%', label: 'Free & Open', icon: Code2 }
            ].map((stat, index) => (
              <div key={index} className="space-y-1 text-center">
                <div className="mb-1 flex justify-center">
                  <stat.icon className="h-4 w-4 text-indigo-500/70" />
                </div>
                <div className="text-3xl font-extrabold text-blue-600 md:text-4xl dark:text-blue-400">
                  {stat.number}
                </div>
                <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 px-4 py-16 dark:border-slate-800/50">
        <div className="mx-auto max-w-6xl">
          {/* Main Footer Content */}
          <div className="mb-12 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/10">
                <BookOpen className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">Sanskrit Games</span>
            </div>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              An open-source interactive education project building modern tools for Sanskrit
              learning.
            </p>
          </div>

          {/* Social Media Links */}
          <div className="mb-12 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                Connect with us
              </span>
            </div>

            <div className="flex justify-center gap-4">
              <a
                href="https://github.com/shubhattin/padavali/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition-all duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
                title="GitHub"
              >
                <SiGithub className="h-6 w-6" />
              </a>

              <a
                href="https://www.youtube.com/@TheSanskritChannel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50/50 text-red-600 shadow-xs transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white"
                title="YouTube"
              >
                <FaYoutube className="h-6 w-6" />
              </a>

              <a
                href="https://www.instagram.com/thesanskritchannel/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-pink-200 bg-linear-to-br from-pink-50/40 to-purple-50/40 text-pink-600 shadow-xs transition-all duration-200 hover:border-pink-500 hover:bg-pink-500 hover:text-white dark:border-pink-950 dark:bg-linear-to-br dark:from-pink-950/20 dark:to-purple-950/20 dark:text-pink-400 dark:hover:border-pink-500 dark:hover:bg-pink-500 dark:hover:text-white"
                title="Instagram"
              >
                <FaInstagram className="h-6 w-6" />
              </a>
            </div>

            {/* Project Links */}
            <div className="mx-auto flex max-w-xl flex-col justify-center gap-3 pt-4 sm:flex-row">
              <a
                href="http://www.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 text-left transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-blue-500/30 dark:hover:bg-blue-950/15"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-green-500 to-emerald-600 shadow-sm">
                  <Book className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Main Site
                    <ChevronRight className="h-3 w-3" />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    The Sanskrit Channel Website
                  </div>
                </div>
              </a>

              <a
                href="https://svara.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 text-left transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-purple-500/30 dark:hover:bg-purple-950/15"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-sm">
                  <Music className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    Svara Darshini
                    <ChevronRight className="h-3 w-3" />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    Understand Principles of Music
                  </div>
                </div>
              </a>
            </div>
          </div>
          <div className="text-center text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
            © {new Date().getFullYear()} Sanskrit Games. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
