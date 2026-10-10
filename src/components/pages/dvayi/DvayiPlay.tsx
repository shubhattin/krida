'use client';

import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, Sparkles } from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { DvayiPuzzleData } from '~/util/dvayi/data';
import { inferDvayiPuzzleData } from '~/util/dvayi/infer';
import type { location_list_type } from '~/db/types';
import { SimpleGameMetrics } from '~/components/pages/simple_game/SimpleGameMetrics';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';

function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i]!;
    next[i] = next[j]!;
    next[j] = current;
  }
  return next;
}

function TransliteratedLabel({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
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
  const [nonce, setNonce] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const rightOrder = useMemo(
    () => shuffle(inferred.right),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inferred, nonce]
  );
  const answer = useMemo(
    () => new Map(inferred.matches.map((match) => [match.leftId, match.rightId])),
    [inferred]
  );

  useEffect(() => {
    if (!started || completed) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [completed, started]);

  const pair = (leftId: string, rightId: string) => {
    if (!started || completed) return;
    setAttempts((value) => value + 1);
    if (answer.get(leftId) === rightId) {
      setGuesses((prev) => ({ ...prev, [leftId]: rightId }));
      setCorrect((value) => value + 1);
      setSelectedLeft(null);
    } else {
      setSelectedLeft(null);
    }
  };

  useEffect(() => {
    if (!started || completed) return;
    if (inferred.matches.length > 0 && Object.keys(guesses).length === inferred.matches.length) {
      setCompleted(true);
    }
  }, [completed, guesses, inferred.matches.length, started]);

  const restart = () => {
    setNonce((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setSelectedLeft(null);
    setGuesses({});
    setCorrect(0);
    setAttempts(0);
  };

  return (
    <div className="space-y-5">
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border border-rose-200/70 bg-white/80 p-4 shadow-sm dark:border-rose-900/40 dark:bg-slate-950/70',
          !started && 'select-none'
        )}
      >
        {!started ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/70">
            <Button
              size="lg"
              className="bg-linear-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30"
              onClick={() => setStarted(true)}
            >
              <Play className="size-5" />
              Start matching
            </Button>
          </div>
        ) : null}
        <div
          className={cn(
            'grid gap-6 md:grid-cols-2',
            !started && 'pointer-events-none blur-[0.5px]'
          )}
        >
          <div className="space-y-2">
            {inferred.left.map((item) => {
              const locked = Boolean(guesses[item.id]);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedLeft(item.id)}
                  className={cn(
                    'w-full rounded-2xl border px-3 py-3 text-left text-lg transition-all',
                    locked
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                      : selectedLeft === item.id
                        ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-400/50 dark:bg-rose-950/40'
                        : 'border-border/70 hover:border-rose-300'
                  )}
                >
                  <TransliteratedLabel text={item.text} />
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            {rightOrder.map((item) => {
              const used = Object.values(guesses).includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={used || !selectedLeft}
                  onClick={() => selectedLeft && pair(selectedLeft, item.id)}
                  className={cn(
                    'w-full rounded-2xl border px-3 py-3 text-left text-lg transition-all',
                    used
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                      : 'border-border/70 hover:border-orange-300 disabled:opacity-50'
                  )}
                >
                  <TransliteratedLabel text={item.text} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {completed ? (
        <div className="rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-5 dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-teal-950/30">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-emerald-500" />
            All pairs matched
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pretty_ms(seconds * 1000, { compact: true })} · {correct}/{attempts} accurate
          </p>
          <Button className="mt-3" variant="outline" onClick={restart}>
            <RotateCcw className="size-4" />
            Play again
          </Button>
        </div>
      ) : null}
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
