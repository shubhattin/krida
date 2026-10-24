'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { AnimatePresence, motion, useAnimate } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { DvayiColumnItem, DvayiPuzzleData } from '~/util/dvayi/data';
import { inferDvayiPuzzleData } from '~/util/dvayi/infer';
import type { location_list_type } from '~/db/types';
import { SimpleGameMetrics } from '~/components/pages/simple_game/SimpleGameMetrics';
import { SimpleGameStartOverlay } from '~/components/pages/simple_game/SimpleGameStartOverlay';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';
import { GameHud } from '~/components/pages/simple_game/play/GameHud';
import { GameCompletion } from '~/components/pages/simple_game/play/GameCompletion';
import { MorePuzzles } from '~/components/pages/simple_game/play/MorePuzzles';
import { useGameClock } from '~/components/pages/simple_game/play/useGameClock';
import { shuffleFewInPlace } from '~/components/pages/simple_game/play/shuffle';
import {
  PLAY_THEME,
  SHAKE_TRANSITION,
  SHAKE_X,
  WRONG_COLOR
} from '~/components/pages/simple_game/play/theme';
import { pairColor, withAlpha } from './pair_colors';

type Side = 'left' | 'right';
type Point = { x: number; y: number };
type Pick = { side: Side; id: string };
type Miss = { leftId: string; rightId: string; key: number };

const ACCENT = PLAY_THEME.dvayi.from;
const MISS_MS = 850;

function curve(from: Point, to: Point) {
  const dx = Math.max(24, Math.abs(to.x - from.x) * 0.5) * (to.x >= from.x ? 1 : -1);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

const anchorKey = (side: Side, id: string) => `${side}:${id}`;

function sameAnchors(a: Record<string, Point>, b: Record<string, Point>) {
  const keys = Object.keys(b);
  if (keys.length !== Object.keys(a).length) return false;
  return keys.every((key) => {
    const p = a[key];
    const q = b[key]!;
    return p !== undefined && Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5;
  });
}

export function DvayiPlay({
  puzzleId,
  location,
  data
}: {
  puzzleId: number;
  location: location_list_type;
  data: DvayiPuzzleData;
}) {
  const inferred = useMemo(() => inferDvayiPuzzleData(data), [data]);
  const answer = useMemo(
    () => new Map(inferred.matches.map((match) => [match.leftId, match.rightId])),
    [inferred]
  );
  const left = useMemo(
    () => inferred.left.filter((item) => answer.has(item.id)),
    [answer, inferred]
  );
  const rightIds = useMemo(() => new Set(answer.values()), [answer]);
  // Pre-start order is alphabetical so the overlay never leaks the answer order.
  const restingRight = useMemo(
    () =>
      inferred.right
        .filter((item) => rightIds.has(item.id))
        .toSorted((a, b) => a.text.localeCompare(b.text)),
    [inferred, rightIds]
  );
  const colorOf = useMemo(
    () => new Map(left.map((item, index) => [item.id, pairColor(index)])),
    [left]
  );

  const [nonce, setNonce] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useGameClock(started && !completed);
  const [rightOrder, setRightOrder] = useState<DvayiColumnItem[]>(restingRight);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Pick | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [miss, setMiss] = useState<Miss | null>(null);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [anchors, setAnchors] = useState<Record<string, Point>>({});

  const boardRef = useRef<HTMLDivElement>(null);
  const press = useRef<(Pick & { x: number; y: number; dragging: boolean }) | null>(null);
  const suppressClick = useRef(false);
  const missTimer = useRef<number | null>(null);
  const missSeq = useRef(0);

  const playing = started && !completed;
  const matchedRight = useMemo(() => new Set(Object.values(matched)), [matched]);
  const leftOfRight = useMemo(
    () => new Map(Object.entries(matched).map(([leftId, rightId]) => [rightId, leftId])),
    [matched]
  );

  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const box = board.getBoundingClientRect();
    const next: Record<string, Point> = {};
    for (const element of board.querySelectorAll<HTMLElement>('[data-dvayi-item]')) {
      const rect = element.getBoundingClientRect();
      // SAFETY: data-side is only ever rendered as 'left' | 'right' by MatchCard.
      const side = element.dataset.side as Side;
      next[anchorKey(side, element.dataset.id ?? '')] = {
        x: (side === 'left' ? rect.right : rect.left) - box.left,
        y: rect.top - box.top + rect.height / 2
      };
    }
    setAnchors((prev) => (sameAnchors(prev, next) ? prev : next));
  }, []);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    for (const element of board.querySelectorAll('[data-dvayi-item]')) observer.observe(element);
    return () => observer.disconnect();
  }, [measure, rightOrder, left]);

  const attempt = (leftId: string, rightId: string) => {
    setAttempts((value) => value + 1);
    setSelected(null);
    if (answer.get(leftId) !== rightId) {
      if (missTimer.current) window.clearTimeout(missTimer.current);
      missSeq.current += 1;
      setMiss({ leftId, rightId, key: missSeq.current });
      missTimer.current = window.setTimeout(() => setMiss(null), MISS_MS);
      return;
    }
    setCorrect((value) => value + 1);
    setMatched((prev) => {
      const next = { ...prev, [leftId]: rightId };
      if (Object.keys(next).length === answer.size) setCompleted(true);
      return next;
    });
  };

  const tap = (side: Side, id: string) => {
    if (!playing) return;
    if (suppressClick.current) return;
    if (selected && selected.side !== side) {
      attempt(side === 'left' ? id : selected.id, side === 'right' ? id : selected.id);
      return;
    }
    setSelected(selected?.id === id ? null : { side, id });
  };

  const toLocal = (event: ReactPointerEvent): Point | null => {
    const box = boardRef.current?.getBoundingClientRect();
    return box ? { x: event.clientX - box.left, y: event.clientY - box.top } : null;
  };

  const itemAt = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-dvayi-item]');
    if (!element || element.dataset.locked === 'true') return null;
    // SAFETY: data-side is only ever rendered as 'left' | 'right' by MatchCard.
    return { side: element.dataset.side as Side, id: element.dataset.id ?? '' };
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    if (!playing || event.button !== 0) return;
    const hit = itemAt(event.clientX, event.clientY);
    if (!hit) return;
    press.current = {
      ...hit,
      x: event.clientX,
      y: event.clientY,
      dragging: false
    };
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!playing) return;
    const current = press.current;
    if (current && !current.dragging) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) {
        current.dragging = true;
        boardRef.current?.setPointerCapture(event.pointerId);
        setSelected({ side: current.side, id: current.id });
        setDragging(true);
      }
    }
    if (event.pointerType === 'mouse' || current?.dragging) setPointer(toLocal(event));
  };

  const onPointerUp = (event: ReactPointerEvent) => {
    const current = press.current;
    press.current = null;
    if (!current?.dragging) return;
    setDragging(false);
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    const hit = itemAt(event.clientX, event.clientY);
    if (hit && hit.side !== current.side) {
      attempt(
        current.side === 'left' ? current.id : hit.id,
        current.side === 'right' ? current.id : hit.id
      );
    } else {
      setSelected(null);
    }
    if (event.pointerType !== 'mouse') setPointer(null);
  };

  const startGame = () => {
    // Keep matches from sitting directly across from their prompt.
    setRightOrder(
      shuffleFewInPlace(
        restingRight,
        (item, index) => answer.get(left[index]?.id ?? '') === item.id
      )
    );
    setStarted(true);
  };

  const restart = () => {
    setNonce((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setMatched({});
    setSelected(null);
    setMiss(null);
    setCorrect(0);
    setAttempts(0);
    setRightOrder(restingRight);
  };

  // Live guide line: from the selected item to the pointer, snapping onto a hovered target.
  const guide = (() => {
    if (!playing || !selected) return null;
    const from = anchors[anchorKey(selected.side, selected.id)];
    if (!from || !pointer) return null;
    const color = selected.side === 'left' ? (colorOf.get(selected.id) ?? ACCENT) : ACCENT;
    const start = selected.side === 'left' ? from : pointer;
    const end = selected.side === 'left' ? pointer : from;
    return { d: curve(start, end), color };
  })();

  const missPath = miss
    ? (() => {
        const from = anchors[anchorKey('left', miss.leftId)];
        const to = anchors[anchorKey('right', miss.rightId)];
        return from && to ? curve(from, to) : null;
      })()
    : null;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          'relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6',
          completed && 'border-emerald-400/50'
        )}
      >
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-2/3 -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
          style={{
            backgroundImage: `linear-gradient(90deg, ${PLAY_THEME.dvayi.from}, ${PLAY_THEME.dvayi.to})`
          }}
        />
        {!started ? <SimpleGameStartOverlay kind="dvayi" onStart={startGame} /> : null}
        <div className="mb-5">
          <GameHud
            kind="dvayi"
            label="Pairs matched"
            done={Object.keys(matched).length}
            total={answer.size}
            seconds={seconds}
            mistakes={attempts - correct}
          />
        </div>
        <div
          ref={boardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            press.current = null;
            setDragging(false);
            setPointer(null);
          }}
          onPointerLeave={() => {
            if (!press.current) setPointer(null);
          }}
          className={cn(
            'relative grid grid-cols-2 gap-x-10 select-none sm:gap-x-24',
            playing && 'touch-none',
            !started && 'pointer-events-none blur-sm'
          )}
        >
          <div className="space-y-2.5">
            {left.map((item) => (
              <MatchCard
                key={item.id}
                side="left"
                item={item}
                color={colorOf.get(item.id) ?? ACCENT}
                matched={Boolean(matched[item.id])}
                selected={selected?.side === 'left' && selected.id === item.id}
                missKey={miss?.leftId === item.id ? miss.key : null}
                interactive={playing}
                onTap={() => tap('left', item.id)}
              />
            ))}
          </div>
          <div className="space-y-2.5">
            {rightOrder.map((item) => {
              const owner = leftOfRight.get(item.id);
              return (
                <MatchCard
                  key={item.id}
                  side="right"
                  item={item}
                  color={owner ? (colorOf.get(owner) ?? ACCENT) : ACCENT}
                  matched={matchedRight.has(item.id)}
                  selected={selected?.side === 'right' && selected.id === item.id}
                  missKey={miss?.rightId === item.id ? miss.key : null}
                  interactive={playing}
                  onTap={() => tap('right', item.id)}
                />
              );
            })}
          </div>

          <svg className="pointer-events-none absolute inset-0 z-20 size-full overflow-visible">
            {Object.entries(matched).map(([leftId, rightId]) => {
              const from = anchors[anchorKey('left', leftId)];
              const to = anchors[anchorKey('right', rightId)];
              if (!from || !to) return null;
              const color = colorOf.get(leftId) ?? ACCENT;
              const d = curve(from, to);
              return (
                <g key={leftId}>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={withAlpha(color, 0.3)}
                    strokeWidth={9}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  />
                  <circle cx={from.x} cy={from.y} r={5} fill={color} />
                  <motion.circle
                    cx={to.x}
                    cy={to.y}
                    r={5}
                    fill={color}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.35,
                      type: 'spring',
                      stiffness: 500,
                      damping: 15
                    }}
                  />
                </g>
              );
            })}
            <AnimatePresence>
              {miss && missPath ? (
                <motion.g key={miss.key} exit={{ opacity: 0 }}>
                  <motion.path
                    d={missPath}
                    fill="none"
                    stroke={withAlpha(WRONG_COLOR, 0.35)}
                    strokeWidth={10}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: [0, 1, 1, 0] }}
                    transition={{
                      duration: MISS_MS / 1000,
                      times: [0, 0.3, 0.6, 1]
                    }}
                  />
                  <motion.path
                    d={missPath}
                    fill="none"
                    stroke={WRONG_COLOR}
                    strokeWidth={3}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: [0, 1, 1, 0] }}
                    transition={{
                      duration: MISS_MS / 1000,
                      times: [0, 0.3, 0.6, 1]
                    }}
                  />
                </motion.g>
              ) : null}
            </AnimatePresence>
            {guide ? (
              <path
                d={guide.d}
                fill="none"
                stroke={guide.color}
                strokeWidth={dragging ? 3 : 2}
                strokeDasharray="6 6"
                strokeLinecap="round"
                opacity={dragging ? 0.95 : 0.55}
              />
            ) : null}
          </svg>
        </div>
      </div>

      <AnimatePresence>
        {completed ? (
          <GameCompletion
            kind="dvayi"
            title="All pairs matched!"
            seconds={seconds}
            correct={correct}
            attempts={attempts}
            onRestart={restart}
          />
        ) : null}
      </AnimatePresence>
      {completed ? <MorePuzzles kind="dvayi" puzzleId={puzzleId} /> : null}
      <SimpleGameMetrics
        kind="dvayi"
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

function cardClass(missed: boolean, matched: boolean, selected: boolean) {
  if (missed) return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300';
  if (matched) return 'cursor-default';
  if (selected) return 'bg-rose-500/10';
  return 'border-border/70 bg-background/70 hover:border-rose-300/80 dark:hover:border-rose-500/50';
}

function cardStyle(tint: string | null, matched: boolean, selected: boolean) {
  if (!tint) return undefined;
  return {
    borderColor: tint,
    backgroundColor: withAlpha(tint, matched ? 0.14 : 0.1),
    boxShadow: `0 0 0 ${selected ? 4 : 0}px ${withAlpha(tint, 0.18)}, 0 6px 20px -8px ${withAlpha(tint, 0.6)}`
  };
}

function MatchCard({
  side,
  item,
  color,
  matched,
  selected,
  missKey,
  interactive,
  onTap
}: {
  side: Side;
  item: DvayiColumnItem;
  color: string;
  matched: boolean;
  selected: boolean;
  missKey: number | null;
  interactive: boolean;
  onTap: () => void;
}) {
  const label = useTransliteratedText(item.text);
  const [scope, animate] = useAnimate<HTMLButtonElement>();
  const missed = missKey !== null;
  const tint = missed ? null : matched ? color : selected ? ACCENT : null;
  const live = interactive && !matched;

  useEffect(() => {
    if (missKey === null || !scope.current) return;
    void animate(scope.current, { x: SHAKE_X }, SHAKE_TRANSITION);
  }, [animate, missKey, scope]);

  useEffect(() => {
    if (!matched || !scope.current) return;
    void animate(scope.current, { scale: [1, 1.06, 1] }, { duration: 0.35 });
  }, [animate, matched, scope]);

  return (
    <motion.button
      ref={scope}
      type="button"
      data-dvayi-item=""
      data-side={side}
      data-id={item.id}
      data-locked={matched ? 'true' : 'false'}
      aria-pressed={selected}
      disabled={!live}
      onClick={onTap}
      whileHover={live ? { y: -2 } : undefined}
      whileTap={live ? { scale: 0.98 } : undefined}
      className={cn(
        'relative flex w-full items-center gap-2 rounded-2xl border-2 px-3 py-3 text-base font-semibold transition-colors duration-200 outline-none focus-visible:ring-4 focus-visible:ring-rose-400/40 sm:px-4 sm:text-lg',
        side === 'right' ? 'flex-row-reverse text-right' : 'text-left',
        cardClass(missed, matched, selected),
        live && 'cursor-pointer'
      )}
      style={cardStyle(tint, matched, selected)}
    >
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {matched ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          <Check className="size-3" strokeWidth={3} />
        </motion.span>
      ) : null}
      <AnchorDot side={side} tint={tint} missed={missed} pulsing={selected} />
    </motion.button>
  );
}

/** Connector socket on the card edge facing the other column. */
function AnchorDot({
  side,
  tint,
  missed,
  pulsing
}: {
  side: Side;
  tint: string | null;
  missed: boolean;
  pulsing: boolean;
}) {
  return (
    <span
      className={cn(
        'absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 bg-background transition-colors',
        side === 'left' ? '-right-[7px]' : '-left-[7px]',
        missed ? 'border-red-500' : !tint && 'border-border'
      )}
      style={tint ? { borderColor: tint, backgroundColor: tint } : undefined}
    >
      {pulsing ? (
        <span
          className="absolute inset-0 animate-ping rounded-full"
          style={{ backgroundColor: tint ?? ACCENT }}
        />
      ) : null}
    </span>
  );
}
