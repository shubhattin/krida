'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { SurupaPuzzleData, SurupaWord } from '~/util/surupa/data';
import { inferSurupaPuzzleData } from '~/util/surupa/infer';
import type { location_list_type } from '~/db/types';
import { SimpleGameMetrics } from '~/components/pages/simple_game/SimpleGameMetrics';
import { SimpleGameStartOverlay } from '~/components/pages/simple_game/SimpleGameStartOverlay';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';
import { GameHud } from '~/components/pages/simple_game/play/GameHud';
import {
  CompletionWordList,
  GameCompletion
} from '~/components/pages/simple_game/play/GameCompletion';
import { MorePuzzles } from '~/components/pages/simple_game/play/MorePuzzles';
import { CollectionUpNext } from '~/components/pages/puzzle/CollectionUpNext';
import { useGameClock } from '~/components/pages/simple_game/play/useGameClock';
import { shuffle } from '~/components/pages/simple_game/play/shuffle';

const ITEM_H = 56;
const SOLVED_MS = 1300;
const SETTLE_MS = 160;

type Column = { options: string[]; answer: number };
type Round = { columns: Column[]; picks: number[]; locked: boolean[] };

function Glyph({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
}

/** Each wheel with a choice starts on a wrong option, so every syllable is a deliberate pick. */
function buildRound(word: SurupaWord | undefined): Round {
  const columns = (word?.syllables ?? []).map((syllable, index) => {
    const options = shuffle([...new Set([syllable, ...(word?.alternatives[index] ?? [])])]);
    return { options, answer: options.indexOf(syllable) };
  });
  const locked = columns.map((column) => column.options.length < 2);
  const picks = columns.map((column, index) => {
    if (locked[index]) return column.answer;
    const offset = 1 + Math.floor(Math.random() * (column.options.length - 1));
    return (column.answer + offset) % column.options.length;
  });
  return { columns, picks, locked };
}

export function SurupaPlay({
  puzzleId,
  location,
  data
}: {
  puzzleId: number;
  location: location_list_type;
  data: SurupaPuzzleData;
}) {
  const words = useMemo(
    () => inferSurupaPuzzleData(data).words.filter((word) => word.syllables.length > 0),
    [data]
  );
  const [nonce, setNonce] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useGameClock(started && !completed);
  const [wordIndex, setWordIndex] = useState(0);
  // Deterministic pre-start round (SSR-safe); shows a distractor where one exists.
  const [round, setRound] = useState<Round>(() => {
    const columns = (words[0]?.syllables ?? []).map((syllable, index) => {
      const options = [...new Set([syllable, ...(words[0]?.alternatives[index] ?? [])])];
      return { options, answer: 0 };
    });
    return {
      columns,
      picks: columns.map((column) => Math.min(1, column.options.length - 1)),
      locked: columns.map(() => false)
    };
  });
  const [solved, setSolved] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const timer = useRef<number | null>(null);
  const playing = started && !completed;

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const finishWord = (index: number) => {
    setSolved(true);
    setCorrect((value) => value + 1);
    setAttempts((value) => value + 1);
    timer.current = window.setTimeout(() => {
      setSolvedCount((value) => value + 1);
      if (index + 1 >= words.length) setCompleted(true);
      else loadWord(index + 1);
    }, SOLVED_MS);
  };

  const loadWord = (index: number) => {
    const next = buildRound(words[index]);
    setWordIndex(index);
    setRound(next);
    setSolved(false);
    // A word whose syllables all lack alternatives is already spelled — don't strand the player.
    if (next.locked.every(Boolean)) finishWord(index);
  };

  // Wheels settle asynchronously; read the freshest round to avoid stale closures.
  const roundRef = useRef(round);
  useLayoutEffect(() => {
    roundRef.current = round;
  }, [round]);

  /** A wheel came to rest. Only the whole word is judged — no per-syllable hints. */
  const settle = (index: number, pick: number) => {
    const current = roundRef.current;
    if (!playing || solved || !current.columns[index]) return;
    const picks = current.picks.map((value, i) => (i === index ? pick : value));
    const next = { ...current, picks };
    roundRef.current = next;
    setRound(next);
    if (current.columns.every((column, i) => picks[i] === column.answer)) finishWord(wordIndex);
  };

  const startGame = () => {
    loadWord(0);
    setStarted(true);
  };

  const restart = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setNonce((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setSolvedCount(0);
    setCorrect(0);
    setAttempts(0);
    setSolved(false);
    setWordIndex(0);
  };

  const spelled = round.columns.map(
    (column, index) => column.options[round.picks[index] ?? 0] ?? ''
  );

  return (
    <div className="space-y-5">
      {completed ? null : (
        <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-2/3 -translate-x-1/2 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 opacity-[0.12] blur-3xl" />
          {!started ? <SimpleGameStartOverlay kind="surupa" onStart={startGame} /> : null}
          <div className="mb-5">
            <GameHud
              kind="surupa"
              label={`Word ${Math.min(wordIndex + 1, words.length)} of ${words.length}`}
              done={solvedCount}
              total={words.length}
              seconds={seconds}
            />
          </div>

          <div
            className={cn(
              'flex flex-col items-center gap-5 py-1',
              !started && 'pointer-events-none blur-sm'
            )}
          >
            <motion.p
              key={`${wordIndex}-${solved}`}
              initial={{ opacity: 0.6, scale: 0.97 }}
              animate={{ opacity: 1, scale: solved ? [1, 1.08, 1] : 1 }}
              className={cn(
                'flex min-h-10 items-center gap-2 text-3xl font-black sm:text-4xl',
                solved ? 'text-emerald-500' : 'text-foreground'
              )}
            >
              <span>
                {spelled.map((text, index) => (
                  <span key={index}>
                    <Glyph text={text} />
                  </span>
                ))}
              </span>
              {solved ? <Check className="size-7" strokeWidth={3} /> : null}
            </motion.p>

            <div className="flex max-w-full flex-wrap justify-center gap-2 sm:gap-3">
              {round.columns.map((column, index) => (
                <Wheel
                  key={`${nonce}-${wordIndex}-${index}-${started}`}
                  column={column}
                  value={round.picks[index] ?? 0}
                  locked={round.locked[index] ?? false}
                  solved={solved}
                  disabled={!playing || solved}
                  onSettle={(pick) => settle(index, pick)}
                  onChange={(pick) => {
                    setRound((prev) => ({
                      ...prev,
                      picks: prev.picks.map((value, i) => (i === index ? pick : value))
                    }));
                  }}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Swipe, drag or scroll the wheels until the word is spelled right
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {completed ? (
          <GameCompletion
            kind="surupa"
            title="Spellings restored!"
            seconds={seconds}
            correct={correct}
            attempts={attempts}
            scored={false}
            onRestart={restart}
          >
            <CompletionWordList words={words.map((word) => word.word)} />
          </GameCompletion>
        ) : null}
      </AnimatePresence>
      {completed ? (
        <div className="flex flex-col gap-4">
          <CollectionUpNext />
          <MorePuzzles kind="surupa" puzzleId={puzzleId} />
        </div>
      ) : null}
      <SimpleGameMetrics
        kind="surupa"
        puzzleId={puzzleId}
        location={location}
        started={started}
        completed={completed}
        seconds={seconds}
        correctAttempts={correct}
        totalAttempts={attempts}
        sessionNonce={nonce}
      />
    </div>
  );
}

/** Copies of the option list rendered so the wheel can spin endlessly (odd, ~41+ rows). */
function loopCopies(count: number) {
  if (count < 2) return 1;
  const copies = Math.max(5, Math.ceil(41 / count));
  return copies % 2 === 0 ? copies + 1 : copies;
}

/**
 * Endless syllable wheel. Options repeat in identical copies; whenever the wheel comes to rest
 * it silently re-centres into the middle copy, so it can be spun either way forever.
 */
function Wheel({
  column,
  value,
  locked,
  solved,
  disabled,
  onSettle,
  onChange
}: {
  column: Column;
  value: number;
  locked: boolean;
  solved: boolean;
  disabled: boolean;
  /** Fired once the wheel comes to rest on a new option. */
  onSettle: (index: number) => void;
  onChange: (index: number) => void;
}) {
  const count = column.options.length;
  const copies = loopCopies(count);
  const total = copies * count;
  const mid = Math.floor(copies / 2) * count;
  const wrap = (virtual: number) => ((virtual % count) + count) % count;

  const listRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(mid + value);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; top: number; lastY: number; lastT: number; v: number } | null>(
    null
  );
  const dragMoved = useRef(false);
  const frozen = locked || disabled;
  const onSettleRef = useRef(onSettle);
  useLayoutEffect(() => {
    onSettleRef.current = onSettle;
  });
  const settleTimer = useRef<number | null>(null);
  const touching = useRef(false);
  const lastSettled = useRef(value);
  // Where an in-flight smooth scroll is heading, so rapid steps accumulate instead of resetting.
  const pendingTarget = useRef<number | null>(null);
  const settleRetries = useRef(0);

  useEffect(
    () => () => {
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
    },
    []
  );

  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = (mid + value) * ITEM_H;
    // Mount-only: later changes come from the user scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Debounced "came to rest" — skipped while a finger or mouse is still holding the wheel. */
  const scheduleSettle = () => {
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const list = listRef.current;
      if (!list || touching.current || (drag.current && dragMoved.current)) return;
      const virtual = Math.min(total - 1, Math.max(0, Math.round(list.scrollTop / ITEM_H)));
      // A smooth scroll is still heading somewhere — don't re-centre underneath it.
      if (
        pendingTarget.current !== null &&
        pendingTarget.current !== virtual &&
        settleRetries.current < 10
      ) {
        settleRetries.current += 1;
        scheduleSettle();
        return;
      }
      settleRetries.current = 0;
      const index = wrap(virtual);
      pendingTarget.current = null;
      // Jump back to the identical row in the middle copy — invisible, keeps the loop endless.
      const home = mid + index;
      if (virtual !== home) {
        list.scrollTop = home * ITEM_H;
        setPosition(home);
      }
      if (index === lastSettled.current) return;
      lastSettled.current = index;
      onSettleRef.current(index);
    }, SETTLE_MS);
  };

  const goVirtual = (virtual: number) => {
    const target = Math.min(total - 1, Math.max(0, virtual));
    pendingTarget.current = target;
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    listRef.current?.scrollTo({ top: target * ITEM_H, behavior: 'smooth' });
  };
  const step = (delta: number) =>
    goVirtual((pendingTarget.current ?? Math.round(position)) + delta);

  const tone = solved ? 'solved' : 'idle';

  // Mouse drag-to-spin; touch keeps native (momentum) scrolling.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (frozen || event.pointerType !== 'mouse' || event.button !== 0) return;
    const list = listRef.current;
    if (!list) return;
    pendingTarget.current = null;
    const now = performance.now();
    drag.current = {
      y: event.clientY,
      top: list.scrollTop,
      lastY: event.clientY,
      lastT: now,
      v: 0
    };
    dragMoved.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const list = listRef.current;
    if (!state || !list) return;
    const dy = event.clientY - state.y;
    if (!dragMoved.current && Math.abs(dy) < 3) return;
    if (!dragMoved.current) {
      // Capture only once it's a real drag, so plain clicks still reach the option buttons.
      dragMoved.current = true;
      list.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    const now = performance.now();
    state.v = (event.clientY - state.lastY) / Math.max(1, now - state.lastT);
    state.lastY = event.clientY;
    state.lastT = now;
    list.scrollTop = state.top - dy;
  };

  const onPointerUp = () => {
    const state = drag.current;
    const list = listRef.current;
    drag.current = null;
    if (!state || !list || !dragMoved.current) return;
    setDragging(false);
    // A quick flick carries up to two extra items; a pause before release means no momentum.
    const fresh = performance.now() - state.lastT < 60;
    const carry = fresh ? Math.max(-2 * ITEM_H, Math.min(2 * ITEM_H, -state.v * 90)) : 0;
    goVirtual(Math.round((list.scrollTop + carry) / ITEM_H));
    scheduleSettle();
    window.setTimeout(() => {
      dragMoved.current = false;
    }, 0);
  };

  const current = Math.round(position);
  const rows = Array.from({ length: total }, (_, virtual) => virtual);

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label="Previous option"
        disabled={frozen}
        onClick={() => step(-1)}
        className="hidden rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-0 sm:block"
      >
        <ChevronUp className="size-4" />
      </button>
      <div
        className={cn(
          'relative w-[4.25rem] rounded-2xl border bg-background/60 sm:w-20',
          tone === 'solved' ? 'border-emerald-500/60' : 'border-border/70'
        )}
        style={{ height: ITEM_H * 3 }}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-x-1 rounded-xl border-2 transition-colors duration-200',
            tone === 'solved'
              ? 'border-emerald-500 bg-emerald-500/15'
              : 'border-violet-500/70 bg-violet-500/10'
          )}
          style={{ top: ITEM_H, height: ITEM_H }}
        />
        {tone === 'solved' ? (
          <span className="absolute -top-2 -right-2 z-10 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
            <Check className="size-3" strokeWidth={3} />
          </span>
        ) : null}
        <div
          ref={listRef}
          role="listbox"
          tabIndex={frozen ? -1 : 0}
          aria-label="Syllable options"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={() => {
            touching.current = true;
            pendingTarget.current = null;
          }}
          onTouchEnd={() => {
            touching.current = false;
            scheduleSettle();
          }}
          onTouchCancel={() => {
            touching.current = false;
            scheduleSettle();
          }}
          onScroll={(event) => {
            scheduleSettle();
            const pos = event.currentTarget.scrollTop / ITEM_H;
            setPosition(pos);
            const index = wrap(Math.round(pos));
            if (index !== value) onChange(index);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              step(1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              step(-1);
            }
          }}
          className={cn(
            'relative size-full touch-pan-y [scrollbar-width:none] overflow-y-auto overscroll-contain rounded-2xl outline-none select-none focus-visible:ring-4 focus-visible:ring-violet-400/40 [&::-webkit-scrollbar]:hidden',
            dragging ? 'cursor-grabbing' : 'snap-y snap-mandatory',
            !frozen && !dragging && 'cursor-grab',
            frozen && 'pointer-events-none overflow-hidden'
          )}
          style={{
            paddingBlock: ITEM_H,
            perspective: 400,
            maskImage: 'linear-gradient(transparent, black 32%, black 68%, transparent)'
          }}
        >
          {rows.map((virtual) => {
            const option = column.options[virtual % count] ?? '';
            const distance = virtual - position;
            const near = Math.min(Math.abs(distance), 2);
            // Only the middle copy is exposed to assistive tech; the rest are visual repeats.
            const primary = virtual >= mid && virtual < mid + count;
            return (
              <button
                key={virtual}
                type="button"
                role={primary ? 'option' : undefined}
                aria-hidden={primary ? undefined : true}
                aria-selected={primary ? wrap(virtual) === value : undefined}
                tabIndex={-1}
                onClick={() => {
                  if (!dragMoved.current) goVirtual(virtual);
                }}
                className={cn(
                  'flex w-full snap-center items-center justify-center text-2xl font-bold transition-colors sm:text-[1.7rem]',
                  virtual !== current
                    ? 'text-muted-foreground'
                    : tone === 'solved'
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-foreground'
                )}
                style={{
                  height: ITEM_H,
                  opacity: 1 - near * 0.35,
                  transform: `rotateX(${Math.max(-60, Math.min(60, distance * -28))}deg) scale(${1 - near * 0.1})`
                }}
              >
                <Glyph text={option} />
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        aria-label="Next option"
        disabled={frozen}
        onClick={() => step(1)}
        className="hidden rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-0 sm:block"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}
