'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { pairColor, withAlpha } from '~/components/pages/dvayi/pair_colors';
import {
  PLAY_THEME,
  SHAKE_TRANSITION,
  SHAKE_X,
  WRONG_COLOR
} from '~/components/pages/simple_game/play/theme';
import type { SimpleGameKind } from '~/util/games/kinds';
import { cn } from '~/lib/utils';
import { DemoPill, PreviewFrame, startDemoLoop, useDemoGate } from './PreviewFrame';

const TILE_BASE =
  'flex items-center justify-center rounded-xl border font-bold transition-colors duration-300';
const TILE_IDLE =
  'border-slate-200 bg-linear-to-br from-white to-slate-50 text-slate-800 shadow-xs dark:border-slate-700 dark:from-slate-800 dark:to-slate-950 dark:text-slate-200';
const TILE_SOLVED =
  'border-emerald-400 bg-linear-to-br from-emerald-50 to-green-100 text-emerald-700 shadow-[0_0_14px_rgba(52,211,153,0.45)] dark:border-emerald-400/90 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-200';
const TILE_WRONG =
  'border-red-400 bg-linear-to-br from-red-50 to-rose-100 text-red-700 dark:border-red-400/90 dark:from-red-950 dark:to-rose-950 dark:text-red-200';

// ─── Dvayī: match the following ───────────────────────────
const DVAYI_LEFT = ['सूर्यः', 'चन्द्रः', 'जलम्', 'अग्निः'];
const DVAYI_RIGHT = ['Water', 'Sun', 'Fire', 'Moon'];
/** Left row → right row of its partner. */
const DVAYI_ANSWER = [1, 3, 0, 2];
/** Scripted taps: one miss (चन्द्रः → Fire) among the correct pairs. */
const DVAYI_MOVES: [left: number, right: number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 0],
  [3, 2]
];
const DVAYI_ROWS = DVAYI_LEFT.length;
const DVAYI_ACCENT = PLAY_THEME.dvayi.from;
/**
 * Board columns are 5fr | 2fr | 5fr: tiles' inner edges sit at 5/12 and 7/12 of the width,
 * tile centres at 5/24 and 19/24.
 */
const DVAYI_EDGE = { left: 5 / 12, right: 7 / 12 } as const;
const DVAYI_CENTER_X = { left: (5 / 24) * 100, right: (19 / 24) * 100 } as const;

type DvayiSide = 'left' | 'right';
type DvayiPick = { left: number; right: number | null; wrong: boolean };

/** Row centre in percent (rows carry their own padding, so centres are exact). */
const dvayiRowY = (row: number) => ((row + 0.5) / DVAYI_ROWS) * 100;

/**
 * Link between two rows in board pixels. The SVG is drawn 1:1 with the board (no stretched
 * viewBox): framer's `pathLength` dashes break on non-uniformly scaled strokes.
 */
const dvayiCurve = (size: { width: number; height: number }, fromRow: number, toRow: number) => {
  const x1 = size.width * DVAYI_EDGE.left;
  const x2 = size.width * DVAYI_EDGE.right;
  const y1 = (dvayiRowY(fromRow) / 100) * size.height;
  const y2 = (dvayiRowY(toRow) / 100) * size.height;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
};

function DvayiLink({ d, color, dashed = false }: { d: string; color: string; dashed?: boolean }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={dashed ? '5 5' : undefined}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.g>
  );
}

function DvayiTile({
  side,
  row,
  word,
  color,
  selected,
  wrong,
  compact
}: {
  side: DvayiSide;
  row: number;
  word: string;
  /** Pair colour once matched. */
  color: string | null;
  selected: boolean;
  wrong: boolean;
  compact: boolean;
}) {
  const tone = wrong ? WRONG_COLOR : (color ?? (selected ? DVAYI_ACCENT : null));
  const inner = side === 'left' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2';
  return (
    <div
      className={cn('relative py-1', side === 'left' ? 'col-start-1' : 'col-start-3')}
      style={{ gridRowStart: row + 1 }}
    >
      <div
        className={cn(
          'flex h-full items-center gap-1.5 rounded-xl border-2 px-2.5 font-semibold',
          'border-slate-200 bg-white text-slate-800 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-100',
          'transition-[border-color,background-color,box-shadow] duration-300 ease-out',
          side === 'left' ? 'justify-between' : 'flex-row-reverse justify-between',
          compact ? 'text-sm' : 'text-base'
        )}
        style={
          tone
            ? {
                borderColor: tone,
                backgroundColor: withAlpha(tone, color ? 0.16 : 0.1),
                boxShadow: `0 0 14px ${withAlpha(tone, color || selected ? 0.3 : 0.2)}`
              }
            : undefined
        }
      >
        <span className="truncate">{word}</span>
        <AnimatePresence>
          {color ? (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className="flex size-4 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: color }}
            >
              <Check className="size-2.5" strokeWidth={3.5} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      {/* Connector dot on the inner edge — where the link attaches. */}
      <span
        className={cn(
          'absolute top-1/2 z-10 size-2 -translate-y-1/2 rounded-full border-2 transition-colors duration-300',
          'border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-900',
          inner
        )}
        style={tone ? { borderColor: tone, backgroundColor: color ?? undefined } : undefined}
      />
    </div>
  );
}

function DvayiMiniPreview({ compact }: { compact: boolean }) {
  const reduceMotion = useReducedMotion();
  const demoGate = useDemoGate();
  const [matched, setMatched] = useState<number[]>(reduceMotion ? [0, 1, 2, 3] : []);
  const [pick, setPick] = useState<DvayiPick | null>(null);
  const [hand, setHand] = useState<{ side: DvayiSide; row: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(demoGate, async (wait) => {
      setMatched([]);
      setPick(null);
      if (!(await wait(800))) return;
      for (const [left, right] of DVAYI_MOVES) {
        setHand({ side: 'left', row: left });
        if (!(await wait(550))) return;
        setPick({ left, right: null, wrong: false });
        if (!(await wait(350))) return;
        setHand({ side: 'right', row: right });
        if (!(await wait(550))) return;
        if (DVAYI_ANSWER[left] === right) {
          setMatched((prev) => [...prev, left]);
          setPick(null);
          if (!(await wait(650))) return;
        } else {
          setPick({ left, right, wrong: true });
          if (!(await wait(950))) return;
          setPick(null);
          if (!(await wait(300))) return;
        }
      }
      setHand(null);
      await wait(2200);
    });
  }, [reduceMotion, demoGate]);

  const colorOfLeft = (left: number) => {
    const order = matched.indexOf(left);
    return order >= 0 ? pairColor(order) : null;
  };
  const colorOfRight = (right: number) => colorOfLeft(DVAYI_ANSWER.indexOf(right));

  return (
    <PreviewFrame
      compact={compact}
      hint="Tap a word, then its partner"
      badge={
        <DemoPill done={matched.length === DVAYI_ROWS}>
          {matched.length}/{DVAYI_ROWS} pairs
        </DemoPill>
      }
    >
      <div
        ref={boardRef}
        className="relative grid aspect-square grid-cols-[5fr_2fr_5fr] grid-rows-4"
      >
        {size ? (
          <svg
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            viewBox={`0 0 ${size.width} ${size.height}`}
            aria-hidden
          >
            <AnimatePresence>
              {matched.map((left, order) => (
                <DvayiLink
                  key={`pair-${left}`}
                  d={dvayiCurve(size, left, DVAYI_ANSWER[left]!)}
                  color={pairColor(order)}
                />
              ))}
              {pick?.wrong && pick.right !== null ? (
                <DvayiLink
                  key="miss"
                  d={dvayiCurve(size, pick.left, pick.right)}
                  color={WRONG_COLOR}
                  dashed
                />
              ) : null}
            </AnimatePresence>
          </svg>
        ) : null}
        {DVAYI_LEFT.map((word, row) => (
          <DvayiTile
            key={word}
            side="left"
            row={row}
            word={word}
            color={colorOfLeft(row)}
            selected={pick?.left === row}
            wrong={!!pick?.wrong && pick.left === row}
            compact={compact}
          />
        ))}
        {DVAYI_RIGHT.map((word, row) => (
          <DvayiTile
            key={word}
            side="right"
            row={row}
            word={word}
            color={colorOfRight(row)}
            selected={pick?.right === row}
            wrong={!!pick?.wrong && pick.right === row}
            compact={compact}
          />
        ))}
        {/* Hand pointer gliding between taps (same idea as the Padāvalī demo). */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-20 -translate-x-1/2 translate-y-[-10%] text-lg drop-shadow-md select-none sm:text-xl"
          initial={false}
          animate={{
            left: `${hand ? DVAYI_CENTER_X[hand.side] : 50}%`,
            top: `${hand ? dvayiRowY(hand.row) : 50}%`,
            opacity: hand ? 1 : 0,
            scale: hand ? 1 : 0.8
          }}
          transition={{
            left: { type: 'spring', stiffness: 170, damping: 24 },
            top: { type: 'spring', stiffness: 170, damping: 24 },
            opacity: { duration: 0.3 },
            scale: { duration: 0.3 }
          }}
        >
          👆
        </motion.span>
      </div>
    </PreviewFrame>
  );
}

// ─── Bhramitā: jumbled words ──────────────────────────────
const BHRAMITA_WORDS: { syllables: string[]; jumble: number[] }[] = [
  { syllables: ['पा', 'णि', 'निः'], jumble: [2, 0, 1] },
  { syllables: ['प', 'त', 'ञ्ज', 'लिः'], jumble: [2, 3, 0, 1] }
];

function BhramitaMiniPreview({ compact }: { compact: boolean }) {
  const reduceMotion = useReducedMotion();
  const demoGate = useDemoGate();
  const groupId = useId();
  const [wordIndex, setWordIndex] = useState(0);
  const [placed, setPlaced] = useState<number[]>(reduceMotion ? [0, 1, 2] : []);
  const word = BHRAMITA_WORDS[wordIndex]!;
  const solved = placed.length === word.syllables.length;

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(demoGate, async (wait) => {
      for (let w = 0; w < BHRAMITA_WORDS.length; w++) {
        setWordIndex(w);
        setPlaced([]);
        if (!(await wait(1000))) return;
        for (let s = 0; s < BHRAMITA_WORDS[w]!.syllables.length; s++) {
          setPlaced((prev) => [...prev, s]);
          if (!(await wait(620))) return;
        }
        if (!(await wait(1500))) return;
      }
    });
  }, [reduceMotion, demoGate]);

  const tileSize = compact ? 'size-11 text-lg' : 'size-13 text-xl';

  return (
    <PreviewFrame
      compact={compact}
      hint="Tap the syllables in order to rebuild the word"
      badge={
        <DemoPill done={solved}>
          Word {wordIndex + 1}/{BHRAMITA_WORDS.length}
        </DemoPill>
      }
    >
      <LayoutGroup id={groupId}>
        <div className="flex aspect-square flex-col items-center justify-center gap-4">
          <div className="flex gap-1.5">
            {BHRAMITA_WORDS.map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 w-5 rounded-full transition-colors',
                  index <= wordIndex ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                )}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            {word.syllables.map((_, slot) => {
              const syllable = placed[slot];
              return (
                <div
                  key={`${wordIndex}-slot-${slot}`}
                  className={cn(
                    'flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/40',
                    tileSize
                  )}
                >
                  {syllable === undefined ? null : (
                    <motion.div
                      layoutId={`${wordIndex}-${syllable}`}
                      className={cn(TILE_BASE, solved ? TILE_SOLVED : TILE_IDLE, 'size-full')}
                    >
                      {word.syllables[syllable]}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className={cn(
              'flex min-h-16 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/40 p-2 dark:border-slate-800 dark:bg-slate-950/40'
            )}
          >
            {word.jumble
              .filter((syllable) => !placed.includes(syllable))
              .map((syllable) => (
                <motion.div
                  key={`${wordIndex}-${syllable}`}
                  layoutId={`${wordIndex}-${syllable}`}
                  className={cn(TILE_BASE, TILE_IDLE, tileSize, 'border-emerald-500/50')}
                >
                  {word.syllables[syllable]}
                </motion.div>
              ))}
            {solved ? (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
              >
                <Check className="size-4" strokeWidth={3} />
                {word.syllables.join('')}
              </motion.span>
            ) : null}
          </div>
        </div>
      </LayoutGroup>
    </PreviewFrame>
  );
}

// ─── Surūpa: spelling corrector wheels ───────────────────
const SURUPA_WORDS: { wheels: string[][]; answer: number[]; start: number[] }[] = [
  {
    wheels: [
      ['क', 'ग', 'घ'],
      ['ने', 'णे', 'ण'],
      ['सः', 'षः', 'शः']
    ],
    answer: [1, 1, 2],
    start: [0, 0, 1]
  },
  {
    wheels: [
      ['वि', 'वी', 'बि'],
      ['ना', 'न', 'णा'],
      ['य', 'या', 'प'],
      ['कः', 'का', 'खः']
    ],
    answer: [0, 0, 0, 0],
    start: [2, 1, 1, 2]
  }
];

function SurupaMiniPreview({ compact }: { compact: boolean }) {
  const reduceMotion = useReducedMotion();
  const demoGate = useDemoGate();
  const [wordIndex, setWordIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>(
    reduceMotion ? SURUPA_WORDS[0]!.answer : SURUPA_WORDS[0]!.start
  );
  const word = SURUPA_WORDS[wordIndex]!;
  const solved = picks.every((pick, wheel) => pick === word.answer[wheel]);

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(demoGate, async (wait) => {
      for (let w = 0; w < SURUPA_WORDS.length; w++) {
        const { start, answer } = SURUPA_WORDS[w]!;
        setWordIndex(w);
        setPicks(start);
        if (!(await wait(1000))) return;
        const current = [...start];
        for (let wheel = 0; wheel < current.length; wheel++) {
          while (current[wheel] !== answer[wheel]) {
            current[wheel] += current[wheel]! < answer[wheel]! ? 1 : -1;
            setPicks([...current]);
            if (!(await wait(480))) return;
          }
        }
        if (!(await wait(1600))) return;
      }
    });
  }, [reduceMotion, demoGate]);

  const rowHeight = compact ? 2.25 : 2.75;

  return (
    <PreviewFrame
      compact={compact}
      hint="Roll the wheels until the word is spelled right"
      badge={
        <DemoPill done={solved}>
          Word {wordIndex + 1}/{SURUPA_WORDS.length}
        </DemoPill>
      }
    >
      <div className="flex aspect-square flex-col items-center justify-center gap-3">
        <div
          className={cn(
            'flex items-center gap-1.5 font-black transition-colors',
            compact ? 'text-xl' : 'text-2xl',
            solved ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'
          )}
        >
          {picks.map((pick, wheel) => word.wheels[wheel]![pick]).join('')}
          {solved ? <Check className="size-5" strokeWidth={3} /> : null}
        </div>
        <div className="flex gap-1.5">
          {word.wheels.map((options, wheel) => {
            const pick = picks[wheel]!;
            const locked = pick === word.answer[wheel];
            return (
              <div
                key={`${wordIndex}-${wheel}`}
                className="relative w-12 overflow-hidden rounded-xl border border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-950/50"
                style={{ height: `${rowHeight * 3}rem` }}
              >
                <div
                  className={cn(
                    'absolute inset-x-1 z-0 rounded-lg border-2 transition-colors duration-300',
                    locked && solved
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-violet-500 bg-violet-500/10'
                  )}
                  style={{ top: `${rowHeight}rem`, height: `${rowHeight}rem` }}
                />
                <motion.div
                  className="relative z-10"
                  animate={{ y: `${(1 - pick) * rowHeight}rem` }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                >
                  {options.map((option, index) => (
                    <div
                      key={option}
                      className={cn(
                        'flex items-center justify-center font-bold transition-opacity',
                        compact ? 'text-base' : 'text-lg',
                        index === pick
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 opacity-50 dark:text-slate-500'
                      )}
                      style={{ height: `${rowHeight}rem` }}
                    >
                      {option}
                    </div>
                  ))}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </PreviewFrame>
  );
}

// ─── Ānveṣī: multiple choice ─────────────────────────────
const ANVESHI_QUESTIONS: {
  question: string;
  options: string[];
  answer: number;
  tries: number[];
}[] = [
  {
    question: 'Who was the father of Rama?',
    options: ['दशरथः', 'विश्वामित्रः', 'वसिष्ठः', 'व्यासः'],
    answer: 0,
    tries: [2, 0]
  },
  {
    question: 'Who composed the Rāmāyaṇa?',
    options: ['व्यासः', 'वाल्मीकिः', 'कालिदासः', 'पाणिनिः'],
    answer: 1,
    tries: [1]
  }
];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function AnveshiMiniPreview({ compact }: { compact: boolean }) {
  const reduceMotion = useReducedMotion();
  const demoGate = useDemoGate();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(reduceMotion ? 0 : null);
  const [revealed, setRevealed] = useState(Boolean(reduceMotion));
  const question = ANVESHI_QUESTIONS[questionIndex]!;
  const correct = revealed && picked === question.answer;

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(demoGate, async (wait) => {
      for (let q = 0; q < ANVESHI_QUESTIONS.length; q++) {
        const { tries } = ANVESHI_QUESTIONS[q]!;
        setQuestionIndex(q);
        setPicked(null);
        setRevealed(false);
        if (!(await wait(1300))) return;
        for (const option of tries) {
          setPicked(option);
          setRevealed(false);
          if (!(await wait(450))) return;
          setRevealed(true);
          if (!(await wait(option === ANVESHI_QUESTIONS[q]!.answer ? 1500 : 900))) return;
        }
      }
    });
  }, [reduceMotion, demoGate]);

  return (
    <PreviewFrame
      compact={compact}
      hint="Pick an answer — hints are there when you need them"
      badge={
        <DemoPill done={correct}>
          Q {questionIndex + 1}/{ANVESHI_QUESTIONS.length}
        </DemoPill>
      }
    >
      <div className="flex aspect-square flex-col justify-center gap-3">
        <div className="flex gap-1.5">
          {ANVESHI_QUESTIONS.map((_, index) => (
            <span
              key={index}
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-[10px] font-bold',
                index === questionIndex
                  ? 'border-sky-500 text-sky-600 ring-2 ring-sky-500/30 dark:text-sky-300'
                  : index < questionIndex
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-300 text-slate-400 dark:border-slate-700'
              )}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={questionIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={cn(
              'font-bold text-slate-800 dark:text-slate-100',
              compact ? 'text-sm' : 'text-base'
            )}
          >
            {question.question}
          </motion.p>
        </AnimatePresence>
        <div className="grid grid-cols-2 gap-1.5">
          {question.options.map((option, index) => {
            const chosen = picked === index;
            const state = !chosen
              ? 'idle'
              : !revealed
                ? 'pending'
                : index === question.answer
                  ? 'right'
                  : 'wrong';
            return (
              <motion.div
                key={`${questionIndex}-${option}`}
                animate={state === 'wrong' ? { x: SHAKE_X } : { x: 0 }}
                transition={SHAKE_TRANSITION}
                className={cn(
                  TILE_BASE,
                  'h-10 justify-start gap-1.5 px-1.5 text-xs',
                  state === 'idle' && TILE_IDLE,
                  state === 'pending' &&
                    'border-sky-400 bg-sky-500/10 text-sky-700 ring-2 ring-sky-400/40 dark:text-sky-200',
                  state === 'right' && TILE_SOLVED,
                  state === 'wrong' && TILE_WRONG
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-200/80 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {OPTION_LETTERS[index]}
                </span>
                <span className="truncate">{option}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PreviewFrame>
  );
}

const SIMPLE_MINI_PREVIEWS = {
  dvayi: DvayiMiniPreview,
  bhramita: BhramitaMiniPreview,
  surupa: SurupaMiniPreview,
  anveshi: AnveshiMiniPreview
} satisfies Record<SimpleGameKind, (props: { compact: boolean }) => ReactNode>;

/** Looping, non-interactive demo of a simple game for the hub showcase cards. */
export function SimpleGameMiniPreview({
  kind,
  compact = false
}: {
  kind: SimpleGameKind;
  compact?: boolean;
}) {
  const Preview = SIMPLE_MINI_PREVIEWS[kind];
  return <Preview compact={compact} />;
}
