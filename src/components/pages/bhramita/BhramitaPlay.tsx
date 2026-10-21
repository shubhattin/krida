'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useAnimate, type PanInfo } from 'framer-motion';
import { Check, Eraser, Shuffle } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import { inferBhramitaPuzzleData, shuffleSyllables } from '~/util/bhramita/infer';
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
import { useGameClock } from '~/components/pages/simple_game/play/useGameClock';
import { shuffle } from '~/components/pages/simple_game/play/shuffle';
import { SHAKE_TRANSITION, SHAKE_X } from '~/components/pages/simple_game/play/theme';

type Tile = { id: string; text: string };
type Status = 'idle' | 'wrong' | 'solved';
type Source = { from: 'pool' } | { from: 'slot'; index: number };

const SOLVED_MS = 1100;
const WRONG_MS = 750;

function Glyph({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
}

function tilesFor(syllables: readonly string[]): Tile[] {
  return syllables.map((text, index) => ({ id: String(index), text }));
}

/** If the full pool would read as the answer, rotate it — the pool must never spell the word. */
function notAnswer(pool: string[], tiles: Tile[]): string[] {
  const read = (ids: readonly string[]) => ids.map((id) => tiles[Number(id)]?.text ?? '').join('');
  const answer = tiles.map((tile) => tile.text).join('');
  if (pool.length !== tiles.length || read(pool) !== answer) return pool;
  for (let shift = 1; shift < pool.length; shift++) {
    const rotated = [...pool.slice(shift), ...pool.slice(0, shift)];
    if (read(rotated) !== answer) return rotated;
  }
  return pool;
}

/** Deterministic (SSR-safe) pre-start order that never shows the answer under the blur. */
function restingPool(tiles: Tile[]): string[] {
  return notAnswer(
    tiles.map((tile) => tile.id),
    tiles
  );
}

/** Pool order that never spells the answer outright. */
function jumble(tiles: Tile[]): string[] {
  return notAnswer(shuffleSyllables(tiles.map((tile) => tile.id)), tiles);
}

function dropTargetAt(info: PanInfo) {
  const x = info.point.x - window.scrollX;
  const y = info.point.y - window.scrollY;
  for (const element of document.elementsFromPoint(x, y)) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.dataset.slot !== undefined)
      return { kind: 'slot' as const, index: Number(element.dataset.slot) };
    if (element.dataset.pool !== undefined) return { kind: 'pool' as const };
  }
  return null;
}

export function BhramitaPlay({
  puzzleId,
  location,
  data
}: {
  puzzleId: number;
  location: location_list_type;
  data: BhramitaPuzzleData;
}) {
  const words = useMemo(
    () => inferBhramitaPuzzleData(data).words.filter((word) => word.syllables.length >= 2),
    [data]
  );
  const [nonce, setNonce] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useGameClock(started && !completed);
  const [index, setIndex] = useState(0);
  const current = words[index];
  const tiles = useMemo(() => tilesFor(current?.syllables ?? []), [current]);
  const [slots, setSlots] = useState<(string | null)[]>(() => tiles.map(() => null));
  const [pool, setPool] = useState<string[]>(() => restingPool(tiles));
  const [status, setStatus] = useState<Status>('idle');
  const [wrongSlots, setWrongSlots] = useState<Set<number>>(new Set());
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const [rowScope, animateRow] = useAnimate<HTMLDivElement>();
  const timer = useRef<number | null>(null);

  const playing = started && !completed;
  const locked = !playing || status !== 'idle';
  const tileById = (id: string) => tiles[Number(id)]!;

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const loadWord = (wordIndex: number) => {
    const nextTiles = tilesFor(words[wordIndex]?.syllables ?? []);
    setIndex(wordIndex);
    setSlots(nextTiles.map(() => null));
    setPool(jumble(nextTiles));
    setStatus('idle');
    setWrongSlots(new Set());
  };

  const evaluate = (nextSlots: (string | null)[]) => {
    if (!current || nextSlots.some((slot) => slot === null)) return;
    setAttempts((value) => value + 1);
    const wrong = new Set(
      nextSlots.flatMap((id, slotIndex) =>
        id !== null && tileById(id).text !== current.syllables[slotIndex] ? [slotIndex] : []
      )
    );
    if (wrong.size === 0) {
      setCorrect((value) => value + 1);
      setStatus('solved');
      timer.current = window.setTimeout(() => {
        setSolvedWords((prev) => [...prev, current.word]);
        if (index + 1 >= words.length) {
          setCompleted(true);
          setStatus('idle');
        } else {
          loadWord(index + 1);
        }
      }, SOLVED_MS);
      return;
    }
    setStatus('wrong');
    setWrongSlots(wrong);
    if (rowScope.current) void animateRow(rowScope.current, { x: SHAKE_X }, SHAKE_TRANSITION);
    timer.current = window.setTimeout(() => {
      // Misplaced tiles bounce back to the pool; correctly placed ones stay put.
      setSlots((prev) => prev.map((id, slotIndex) => (wrong.has(slotIndex) ? null : id)));
      setPool((prev) =>
        notAnswer([...prev, ...[...wrong].map((slotIndex) => nextSlots[slotIndex]!)], tiles)
      );
      setWrongSlots(new Set());
      setStatus('idle');
    }, WRONG_MS);
  };

  const place = (tileId: string, source: Source, slotIndex?: number) => {
    if (locked) return;
    const nextSlots = [...slots];
    let nextPool = [...pool];
    const target = slotIndex ?? nextSlots.findIndex((slot) => slot === null);
    if (target < 0) return;
    const displaced = nextSlots[target];
    if (source.from === 'pool') {
      nextPool = nextPool.filter((id) => id !== tileId);
      if (displaced) nextPool.push(displaced);
    } else {
      if (source.index === target) return;
      nextSlots[source.index] = displaced ?? null;
    }
    nextSlots[target] = tileId;
    setSlots(nextSlots);
    setPool(nextPool);
    evaluate(nextSlots);
  };

  const unplace = (slotIndex: number) => {
    if (locked) return;
    const id = slots[slotIndex];
    if (!id) return;
    setSlots((prev) => prev.map((slot, i) => (i === slotIndex ? null : slot)));
    setPool((prev) => [...prev, id]);
  };

  const clearAll = () => {
    if (locked) return;
    setPool((prev) =>
      notAnswer([...prev, ...slots.filter((id): id is string => id !== null)], tiles)
    );
    setSlots((prev) => prev.map(() => null));
  };

  const onDragEnd = (tileId: string, source: Source, info: PanInfo) => {
    const target = dropTargetAt(info);
    if (!target) return;
    if (target.kind === 'slot') place(tileId, source, target.index);
    else if (source.from === 'slot') unplace(source.index);
  };

  // Keyboard: 1–9 picks from the pool, Backspace returns the last placed tile.
  useEffect(() => {
    if (!playing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.key === 'Backspace') {
        const last = slots.findLastIndex((slot) => slot !== null);
        if (last >= 0) unplace(last);
        return;
      }
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && pool[digit - 1]) {
        place(pool[digit - 1]!, { from: 'pool' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
    setCorrect(0);
    setAttempts(0);
    setSolvedWords([]);
    const first = tilesFor(words[0]?.syllables ?? []);
    setIndex(0);
    setSlots(first.map(() => null));
    setPool(restingPool(first));
    setStatus('idle');
  };

  return (
    <div className="space-y-5">
      {completed ? null : (
        <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-2/3 -translate-x-1/2 rounded-full bg-linear-to-r from-emerald-500 to-teal-500 opacity-[0.12] blur-3xl" />
          {!started ? <SimpleGameStartOverlay kind="bhramita" onStart={startGame} /> : null}
          <div className="mb-5">
            <GameHud
              kind="bhramita"
              label={`Word ${Math.min(index + 1, words.length)} of ${words.length}`}
              done={solvedWords.length}
              total={words.length}
              seconds={seconds}
              mistakes={attempts - correct}
            />
          </div>

          <LayoutGroup id={`bhramita-${nonce}-${index}`}>
            <div
              className={cn(
                'flex flex-col items-center gap-6 py-2',
                !started && 'pointer-events-none blur-sm'
              )}
            >
              <div className="flex items-center gap-1.5">
                {words.map((word, wordIndex) => (
                  <span
                    key={word.id}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      wordIndex < solvedWords.length
                        ? 'w-5 bg-emerald-500'
                        : wordIndex === index
                          ? 'w-8 bg-linear-to-r from-emerald-400 to-teal-500'
                          : 'w-5 bg-muted'
                    )}
                  />
                ))}
              </div>

              <div ref={rowScope} className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {slots.map((tileId, slotIndex) => {
                  const wrong = wrongSlots.has(slotIndex);
                  return (
                    <div
                      key={slotIndex}
                      data-slot={slotIndex}
                      className={cn(
                        'relative flex h-16 min-w-16 items-center justify-center rounded-2xl border-2 border-dashed transition-colors duration-200 sm:h-[4.5rem] sm:min-w-[4.5rem]',
                        tileId
                          ? 'border-transparent'
                          : 'border-emerald-400/40 bg-emerald-500/5 dark:border-emerald-500/30'
                      )}
                    >
                      {!tileId ? (
                        <span className="text-xs font-semibold text-emerald-600/40 tabular-nums dark:text-emerald-400/30">
                          {slotIndex + 1}
                        </span>
                      ) : (
                        <TileButton
                          key={tileId}
                          tile={tileById(tileId)}
                          tone={status === 'solved' ? 'solved' : wrong ? 'wrong' : 'placed'}
                          delay={status === 'solved' ? slotIndex * 0.06 : 0}
                          disabled={locked}
                          onTap={() => unplace(slotIndex)}
                          onDragEnd={(info) =>
                            onDragEnd(tileId, { from: 'slot', index: slotIndex }, info)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence>
                {status === 'solved' ? (
                  <motion.p
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="-my-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="size-4" strokeWidth={3} />
                    Correct!
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {completed ? null : (
                <>
                  <div
                    data-pool=""
                    className="flex min-h-20 w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/40 p-3 sm:gap-3"
                  >
                    {pool.length === 0 ? (
                      <span className="text-xs text-muted-foreground">All syllables placed</span>
                    ) : (
                      pool.map((tileId, poolIndex) => (
                        <TileButton
                          key={tileId}
                          tile={tileById(tileId)}
                          tone="pool"
                          hotkey={poolIndex < 9 ? poolIndex + 1 : undefined}
                          disabled={locked}
                          onTap={() => place(tileId, { from: 'pool' })}
                          onDragEnd={(info) => onDragEnd(tileId, { from: 'pool' }, info)}
                        />
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={locked || pool.length < 2}
                      onClick={() => setPool((prev) => notAnswer(shuffle(prev), tiles))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      <Shuffle className="size-3.5" />
                      Shuffle
                    </button>
                    <button
                      type="button"
                      disabled={locked || slots.every((slot) => slot === null)}
                      onClick={clearAll}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      <Eraser className="size-3.5" />
                      Clear
                    </button>
                  </div>
                </>
              )}
            </div>
          </LayoutGroup>

          {solvedWords.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 border-t border-border/50 pt-4">
              {solvedWords.map((word, wordIndex) => (
                <motion.span
                  key={`${word}-${wordIndex}`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  <Check className="size-3.5" />
                  <Glyph text={word} />
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <AnimatePresence>
        {completed ? (
          <GameCompletion
            kind="bhramita"
            title="All words unscrambled!"
            seconds={seconds}
            correct={correct}
            attempts={attempts}
            onRestart={restart}
          >
            <CompletionWordList words={solvedWords} />
          </GameCompletion>
        ) : null}
      </AnimatePresence>
      {completed ? <MorePuzzles kind="bhramita" puzzleId={puzzleId} /> : null}
      <SimpleGameMetrics
        kind="bhramita"
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

const TONE_CLASS = {
  pool: 'border-emerald-300/70 bg-background text-foreground shadow-sm hover:border-emerald-400 hover:shadow-md dark:border-emerald-700/60 dark:bg-slate-900',
  placed:
    'border-emerald-500 bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25',
  wrong: 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/30',
  solved: 'border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
} as const;

function TileButton({
  tile,
  tone,
  hotkey,
  delay = 0,
  disabled,
  onTap,
  onDragEnd
}: {
  tile: Tile;
  tone: keyof typeof TONE_CLASS;
  hotkey?: number;
  delay?: number;
  disabled: boolean;
  onTap: () => void;
  onDragEnd: (info: PanInfo) => void;
}) {
  const dragged = useRef(false);
  return (
    <motion.button
      type="button"
      layoutId={`tile-${tile.id}`}
      drag={!disabled}
      dragSnapToOrigin
      dragElastic={0.6}
      whileDrag={{ scale: 1.12, zIndex: 50, cursor: 'grabbing' }}
      whileHover={disabled ? undefined : { y: -3 }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(_, info) => onDragEnd(info)}
      onClick={() => {
        if (dragged.current) {
          dragged.current = false;
          return;
        }
        if (!disabled) onTap();
      }}
      animate={
        tone === 'solved'
          ? { y: [0, -10, 0], transition: { delay, duration: 0.45 } }
          : tone === 'wrong'
            ? { opacity: [1, 0.55, 1, 0.55, 1], transition: { duration: 0.6 } }
            : { y: 0, opacity: 1 }
      }
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      className={cn(
        'relative flex h-14 min-w-14 touch-none items-center justify-center rounded-2xl border-2 px-3 text-2xl font-bold select-none sm:h-16 sm:min-w-16 sm:text-3xl',
        disabled ? 'cursor-default' : 'cursor-grab',
        TONE_CLASS[tone]
      )}
    >
      <Glyph text={tile.text} />
      {hotkey ? (
        <span className="absolute top-1 right-1.5 hidden text-[10px] font-semibold text-muted-foreground/60 sm:block">
          {hotkey}
        </span>
      ) : null}
    </motion.button>
  );
}
