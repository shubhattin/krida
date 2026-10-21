'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
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
import { DemoPill, PreviewFrame, startDemoLoop } from './PreviewFrame';

const TILE_BASE =
  'flex items-center justify-center rounded-xl border font-bold transition-colors duration-300';
const TILE_IDLE =
  'border-slate-200 bg-linear-to-br from-white to-slate-50 text-slate-800 shadow-xs dark:border-slate-700 dark:from-slate-800 dark:to-slate-950 dark:text-slate-200';
const TILE_SOLVED =
  'border-emerald-400 bg-linear-to-br from-emerald-50 to-green-100 text-emerald-700 shadow-[0_0_14px_rgba(52,211,153,0.45)] dark:border-emerald-400/90 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-200';
const TILE_WRONG =
  'border-red-400 bg-linear-to-br from-red-50 to-rose-100 text-red-700 dark:border-red-400/90 dark:from-red-950 dark:to-rose-950 dark:text-red-200';

// ─── Dvayī: match the following ───────────────────────────
const DVAYI_LEFT = ['राम', 'शिव', 'विष्णु', 'ब्रह्मा'];
const DVAYI_RIGHT = ['लक्ष्मी', 'सीता', 'सरस्वती', 'पार्वती'];
/** Left row → right row of its partner. */
const DVAYI_ANSWER = [1, 3, 0, 2];
/** Scripted taps: one miss (शिव → सरस्वती) among the correct pairs. */
const DVAYI_MOVES: [left: number, right: number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 0],
  [3, 2]
];
const DVAYI_ROWS = DVAYI_LEFT.length;
const DVAYI_ACCENT = PLAY_THEME.dvayi.from;

type DvayiPick = { left: number; right: number | null; wrong: boolean };

/** Row centre on a 0–100 viewBox (rows have no gap, so centres are exact). */
const dvayiRowY = (row: number) => ((row + 0.5) / DVAYI_ROWS) * 100;

function DvayiMiniPreview({ compact }: { compact: boolean }) {
  const reduceMotion = useReducedMotion();
  const [matched, setMatched] = useState<number[]>(reduceMotion ? [0, 1, 2, 3] : []);
  const [pick, setPick] = useState<DvayiPick | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(async (wait) => {
      setMatched([]);
      setPick(null);
      if (!(await wait(900))) return;
      for (const [left, right] of DVAYI_MOVES) {
        setPick({ left, right: null, wrong: false });
        if (!(await wait(520))) return;
        const wrong = DVAYI_ANSWER[left] !== right;
        setPick({ left, right, wrong });
        if (!(await wait(wrong ? 800 : 380))) return;
        if (!wrong) setMatched((prev) => [...prev, left]);
        setPick(null);
        if (!(await wait(260))) return;
      }
      await wait(1900);
    });
  }, [reduceMotion]);

  const pairIndex = (left: number) => matched.indexOf(left);
  const rightOwner = (right: number) => DVAYI_ANSWER.findIndex((r) => r === right);

  const tileStyle = (color: string | null, wrong: boolean) =>
    wrong
      ? { borderColor: WRONG_COLOR, backgroundColor: withAlpha(WRONG_COLOR, 0.12) }
      : color
        ? { borderColor: color, backgroundColor: withAlpha(color, 0.14) }
        : undefined;

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
      <div className="relative grid aspect-square grid-cols-[1fr_2.5rem_1fr] grid-rows-4">
        <svg
          className="pointer-events-none col-start-2 row-span-4 row-start-1 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {matched.map((left) => (
            <motion.line
              key={left}
              x1={0}
              y1={dvayiRowY(left)}
              x2={100}
              y2={dvayiRowY(DVAYI_ANSWER[left]!)}
              stroke={pairColor(pairIndex(left))}
              strokeWidth={3}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          ))}
          {pick?.right != null ? (
            <line
              x1={0}
              y1={dvayiRowY(pick.left)}
              x2={100}
              y2={dvayiRowY(pick.right)}
              stroke={pick.wrong ? WRONG_COLOR : DVAYI_ACCENT}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={pick.wrong ? '4 4' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        {DVAYI_LEFT.map((word, row) => {
          const index = pairIndex(row);
          const active = pick?.left === row;
          return (
            <div key={word} className="col-start-1 py-1" style={{ gridRowStart: row + 1 }}>
              <motion.div
                animate={active && pick?.wrong ? { x: SHAKE_X } : { x: 0 }}
                transition={SHAKE_TRANSITION}
                className={cn(
                  TILE_BASE,
                  TILE_IDLE,
                  'h-full justify-start px-2.5',
                  compact ? 'text-xs' : 'text-sm',
                  active && !pick?.wrong && 'ring-2 ring-rose-400/70'
                )}
                style={tileStyle(
                  index >= 0 ? pairColor(index) : active ? DVAYI_ACCENT : null,
                  active && pick.wrong
                )}
              >
                {word}
              </motion.div>
            </div>
          );
        })}
        {DVAYI_RIGHT.map((word, row) => {
          const owner = rightOwner(row);
          const index = matched.includes(owner) ? pairIndex(owner) : -1;
          const active = pick?.right === row;
          return (
            <div key={word} className="col-start-3 py-1" style={{ gridRowStart: row + 1 }}>
              <motion.div
                animate={active && pick?.wrong ? { x: SHAKE_X } : { x: 0 }}
                transition={SHAKE_TRANSITION}
                className={cn(
                  TILE_BASE,
                  TILE_IDLE,
                  'h-full justify-end px-2.5',
                  compact ? 'text-xs' : 'text-sm'
                )}
                style={tileStyle(
                  index >= 0 ? pairColor(index) : active ? DVAYI_ACCENT : null,
                  active && pick.wrong
                )}
              >
                {word}
              </motion.div>
            </div>
          );
        })}
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
  const groupId = useId();
  const [wordIndex, setWordIndex] = useState(0);
  const [placed, setPlaced] = useState<number[]>(reduceMotion ? [0, 1, 2] : []);
  const word = BHRAMITA_WORDS[wordIndex]!;
  const solved = placed.length === word.syllables.length;

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(async (wait) => {
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
  }, [reduceMotion]);

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
  const [wordIndex, setWordIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>(
    reduceMotion ? SURUPA_WORDS[0]!.answer : SURUPA_WORDS[0]!.start
  );
  const word = SURUPA_WORDS[wordIndex]!;
  const solved = picks.every((pick, wheel) => pick === word.answer[wheel]);

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(async (wait) => {
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
  }, [reduceMotion]);

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
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(reduceMotion ? 0 : null);
  const [revealed, setRevealed] = useState(Boolean(reduceMotion));
  const question = ANVESHI_QUESTIONS[questionIndex]!;
  const correct = revealed && picked === question.answer;

  useEffect(() => {
    if (reduceMotion) return;
    return startDemoLoop(async (wait) => {
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
  }, [reduceMotion]);

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
