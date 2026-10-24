'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '~/lib/utils';
import { DemoPill, PreviewFrame, startDemoLoop, useDemoGate } from './PreviewFrame';

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

// ─── Padajala Mini Demo Constants ─────────────────────────
// A simplified padajala shape for visual preview
// 1 = filled cell, 0 = empty
const PADAJALA_GRID = [
  [0, 0, 0, 0, 0], // Row 0
  [0, 1, 1, 1, 1], // Row 1: . Y O G A
  [0, 0, 0, 1, 0], // Row 2: . . . I .
  [0, 0, 0, 1, 0], // Row 3: . . . T .
  [1, 1, 1, 1, 0] // Row 4: V E D A .
];

const PADAJALA_LETTERS = [
  ['', '', '', '', ''],
  ['', 'Y', 'O', 'G', 'A'],
  ['', '', '', 'I', ''],
  ['', '', '', 'T', ''],
  ['V', 'E', 'D', 'A', '']
];

// Color green as soon as the word containing the cell is completed
// - YOGA is complete at filledCount >= 4
// - GITA is complete at filledCount >= 10
// - VEDA (and GITA) are complete at filledCount >= 10
function padajalaCellWordComplete(index: number, filledCount: number): boolean {
  if (index <= 3) return filledCount >= 4;
  if (index <= 5) return filledCount >= 10;
  if (index <= 9) return filledCount >= 10;
  return false;
}

const PadajalaPreviewCell = ({
  row,
  col,
  index,
  filledCount
}: {
  row: number;
  col: number;
  index: number;
  filledCount: number;
}) => {
  const isFilled = index < filledCount;
  const letter = PADAJALA_LETTERS[row]?.[col] || '';
  const isWordComplete = padajalaCellWordComplete(index, filledCount);

  return (
    <div
      key={`${row}-${col}`}
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
            key={`letter-${row}-${col}`}
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
            key={`dot-${row}-${col}`}
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
};

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

/**
 * Deliberate misses: real fragments that are not hidden words, kept clear of the
 * DEMO_WORDS cells so a miss never paints over (or retraces) a word the demo finds.
 */
const MISS_WORDS: { text: string; path: CellPos[] }[] = [
  {
    text: 'संस्कृ',
    path: [
      { row: 1, col: 0 },
      { row: 1, col: 1 }
    ]
  },
  {
    text: 'ङ्गल',
    path: [
      { row: 0, col: 3 },
      { row: 0, col: 4 }
    ]
  },
  {
    text: 'लाक',
    path: [
      { row: 4, col: 3 },
      { row: 4, col: 4 }
    ]
  }
];

function cellsEqual(a: CellPos, b: CellPos) {
  return a.row === b.row && a.col === b.col;
}

function isCellInPath(path: CellPos[], row: number, col: number) {
  return path.some((c) => c.row === row && c.col === col);
}

type DemoState = 'idle' | 'selecting' | 'success' | 'fail';

// Solid base (keeps trails under glyphs) + neon rim/glow on active states
function miniDemoCellClassName(
  inDemo: boolean,
  inFound: boolean,
  isLast: boolean,
  demoState: DemoState,
  compact: boolean
): string {
  return cn(
    'relative z-10 flex aspect-square items-center justify-center border font-extrabold transition-all duration-300',
    compact ? 'rounded-lg text-sm' : 'rounded-xl text-base',
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
    isLast && demoState === 'selecting' && 'ring-2 ring-blue-300/80 dark:ring-blue-400/70'
  );
}

const MiniDemoCell = ({
  letter,
  row,
  col,
  inDemo,
  inFound,
  isLast,
  demoState,
  compact = false
}: {
  letter: string;
  row: number;
  col: number;
  inDemo: boolean;
  inFound: boolean;
  isLast: boolean;
  demoState: DemoState;
  compact?: boolean;
}) => (
  <div
    key={`${row}-${col}`}
    data-mini-row={row}
    data-mini-col={col}
    className={miniDemoCellClassName(inDemo, inFound, isLast, demoState, compact)}
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

// ─── Padavali Mini Grid Preview ───────────────────────────
type Point = { x: number; y: number };
const cellKey = ({ row, col }: CellPos) => `${row}-${col}`;

const TRAIL_STROKE = {
  idle: {
    glow: 'stroke-blue-300 dark:stroke-blue-400',
    main: 'stroke-blue-500 dark:stroke-blue-400'
  },
  selecting: {
    glow: 'stroke-blue-300 dark:stroke-blue-400',
    main: 'stroke-blue-500 dark:stroke-blue-400'
  },
  success: {
    glow: 'stroke-emerald-300 dark:stroke-emerald-400',
    main: 'stroke-emerald-500 dark:stroke-emerald-400'
  },
  fail: { glow: 'stroke-red-300 dark:stroke-red-400', main: 'stroke-red-500 dark:stroke-red-400' }
} as const satisfies Record<DemoState, { glow: string; main: string }>;

const LABEL_TONE = {
  idle: '',
  selecting: 'border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  success: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  fail: 'border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
} as const satisfies Record<DemoState, string>;

function Trail({ points, stroke }: { points: string; stroke: { glow: string; main: string } }) {
  return (
    <g>
      <polyline
        points={points}
        fill="none"
        className={stroke.glow}
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
      <polyline
        points={points}
        fill="none"
        className={stroke.main}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * Mirrors GameGrid's idle demo: a hand traces each hidden word (blue → green), with an
 * occasional scripted miss (red). Found words keep their trail until the lap restarts.
 */
export function PadavaliMiniPreview({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  const demoGate = useDemoGate();
  const gridRef = useRef<HTMLDivElement>(null);
  const [demoPath, setDemoPath] = useState<CellPos[]>([]);
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [hand, setHand] = useState<{ pos: CellPos; visible: boolean } | null>(null);
  const [foundWords, setFoundWords] = useState<{ text: string; path: CellPos[] }[]>(
    reduceMotion ? DEMO_WORDS : []
  );
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  /** Cell centres in grid pixels; trails and the hand derive from these during render. */
  const [centers, setCenters] = useState<Record<string, Point>>({});

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const parent = el.getBoundingClientRect();
      const next: Record<string, Point> = {};
      for (const cell of el.querySelectorAll<HTMLElement>('[data-mini-row]')) {
        const rect = cell.getBoundingClientRect();
        next[`${cell.dataset.miniRow}-${cell.dataset.miniCol}`] = {
          x: rect.left + rect.width / 2 - parent.left,
          y: rect.top + rect.height / 2 - parent.top
        };
      }
      setCenters(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    let lap = 0;
    return startDemoLoop(demoGate, async (wait) => {
      setFoundWords([]);
      // One scripted miss per lap, after the second find, rotating through MISS_WORDS.
      const miss = MISS_WORDS[lap++ % MISS_WORDS.length]!;
      const script = [...DEMO_WORDS.slice(0, 2), miss, ...DEMO_WORDS.slice(2)];

      for (const word of script) {
        const isMiss = word === miss;
        setDemoPath([]);
        setDemoState('idle');
        setActiveLabel(null);
        if (!(await wait(1100))) return;

        setActiveLabel(word.text);
        setDemoState('selecting');
        for (let i = 0; i < word.path.length; i++) {
          setDemoPath(word.path.slice(0, i + 1));
          setHand({ pos: word.path[i]!, visible: true });
          if (!(await wait(560))) return;
        }

        if (isMiss) {
          setDemoState('fail');
          if (!(await wait(1200))) return;
        } else {
          setDemoState('success');
          setFoundWords((prev) => [...prev, word]);
          if (!(await wait(1600))) return;
        }
        setHand((prev) => (prev ? { ...prev, visible: false } : prev));
      }
      await wait(1200);
    });
  }, [reduceMotion, demoGate]);

  const pointsOf = (cells: CellPos[]) =>
    cells
      .map((cell) => centers[cellKey(cell)])
      .filter((point): point is Point => point !== undefined)
      .map(({ x, y }) => `${x},${y}`)
      .join(' ');

  const handPoint = hand ? centers[cellKey(hand.pos)] : undefined;
  const lastCell = demoPath.at(-1);

  return (
    <PreviewFrame
      compact={compact}
      hint="Drag across letters to find words"
      badge={
        <>
          <AnimatePresence mode="wait">
            {activeLabel && demoState !== 'idle' ? (
              <motion.span
                key={activeLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold shadow-xs',
                  LABEL_TONE[demoState]
                )}
              >
                {activeLabel}
              </motion.span>
            ) : null}
          </AnimatePresence>
          <DemoPill done={foundWords.length > 0}>
            {foundWords.length}/{DEMO_WORDS.length}
          </DemoPill>
        </>
      }
    >
      {/* Grid + hand + trails — SVG under opaque cells (like GameGrid) */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          {foundWords.map((word) =>
            // The active word's live trail is drawn below instead.
            demoPath.length > 1 && word.text === activeLabel ? null : (
              <Trail key={word.text} points={pointsOf(word.path)} stroke={TRAIL_STROKE.success} />
            )
          )}
          {demoPath.length > 1 ? (
            <Trail points={pointsOf(demoPath)} stroke={TRAIL_STROKE[demoState]} />
          ) : null}
        </svg>

        <div
          ref={gridRef}
          className={cn('relative z-10 grid grid-cols-5', compact ? 'gap-1.5' : 'gap-2.5')}
          style={{ gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)` }}
        >
          {MOCK_GRID.map((rowArr, rIdx) =>
            rowArr.map((letter, cIdx) => {
              const inDemo = isCellInPath(demoPath, rIdx, cIdx);
              return (
                <MiniDemoCell
                  key={`${rIdx}-${cIdx}`}
                  letter={letter}
                  row={rIdx}
                  col={cIdx}
                  inDemo={inDemo}
                  inFound={foundWords.some((w) => isCellInPath(w.path, rIdx, cIdx))}
                  isLast={inDemo && !!lastCell && cellsEqual(lastCell, { row: rIdx, col: cIdx })}
                  demoState={demoState}
                  compact={compact}
                />
              );
            })
          )}

          {/* Hand pointer — above cells + trails, pinned to measured cell centres */}
          {handPoint ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-0 left-0 z-30 -translate-x-1/2 translate-y-[-18%] text-lg drop-shadow-md select-none sm:text-2xl"
              initial={false}
              animate={{
                x: handPoint.x,
                y: handPoint.y,
                opacity: hand?.visible ? 1 : 0,
                scale: hand?.visible ? 1 : 0.8
              }}
              transition={{
                x: { type: 'spring', stiffness: 260, damping: 26 },
                y: { type: 'spring', stiffness: 260, damping: 26 },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 }
              }}
            >
              👆
            </motion.div>
          ) : null}
        </div>
      </div>
    </PreviewFrame>
  );
}

// ─── Padajala Mini Preview ────────────────────────────────
const PADAJALA_TOTAL = PADAJALA_GRID.flat().filter(Boolean).length;

export function PadajalaMiniPreview({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  const demoGate = useDemoGate();
  const [filledCount, setFilledCount] = useState(reduceMotion ? PADAJALA_TOTAL : 0);

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(demoGate, async (wait) => {
      setFilledCount(0);
      if (!(await wait(1200))) return;
      for (let i = 1; i <= PADAJALA_TOTAL; i++) {
        setFilledCount(i);
        if (!(await wait(320))) return;
      }
      await wait(3000);
    });
  }, [reduceMotion, demoGate]);

  // YOGA completes at 4 cells; GITA and VEDA share the final cell.
  const wordsFound = (filledCount >= 4 ? 1 : 0) + (filledCount >= PADAJALA_TOTAL ? 2 : 0);
  let cellIndex = 0;

  return (
    <PreviewFrame
      compact={compact}
      hint="Fill the grid from the clues"
      badge={<DemoPill done={wordsFound === 3}>{wordsFound}/3 words found</DemoPill>}
    >
      <div className={cn('grid grid-cols-5', compact ? 'gap-1.5' : 'gap-2')}>
        {PADAJALA_GRID.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <PadajalaPreviewCell
                key={`cell-${rIdx}-${cIdx}`}
                row={rIdx}
                col={cIdx}
                index={cellIndex++}
                filledCount={filledCount}
              />
            ) : (
              <div
                key={`${rIdx}-${cIdx}`}
                className="aspect-square rounded-xl border border-slate-200/60 bg-slate-200/40 dark:border-slate-800/50 dark:bg-slate-950/90"
              />
            )
          )
        )}
      </div>
    </PreviewFrame>
  );
}
