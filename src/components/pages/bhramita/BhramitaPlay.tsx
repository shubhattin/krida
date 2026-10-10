'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import { inferBhramitaPuzzleData, shuffleSyllables } from '~/util/bhramita/infer';
import type { location_list_type } from '~/db/types';
import { SimpleGameMetrics } from '~/components/pages/simple_game/SimpleGameMetrics';
import { SimpleGameStartOverlay } from '~/components/pages/simple_game/SimpleGameStartOverlay';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';

function Label({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
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
  const [seconds, setSeconds] = useState(0);
  const [index, setIndex] = useState(0);
  const [built, setBuilt] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>(() => words[0]?.syllables ?? []);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const current = words[index];

  useEffect(() => {
    if (!started || completed) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [completed, started]);

  const advanceIfComplete = (nextBuilt: string[]) => {
    if (!current) return;
    if (nextBuilt.length !== current.syllables.length) return;
    setAttempts((value) => value + 1);
    if (nextBuilt.join('') !== current.syllables.join('')) return;
    setCorrect((value) => value + 1);
    if (index + 1 >= words.length) {
      setCompleted(true);
      return;
    }
    const next = words[index + 1]!;
    setIndex((value) => value + 1);
    setBuilt([]);
    setPool(shuffleSyllables(next.syllables));
  };

  const take = (syllable: string, fromPool: boolean, itemIndex: number) => {
    if (!started || completed || !current) return;
    if (fromPool) {
      const nextBuilt = [...built, syllable];
      setPool((prev) => prev.filter((_, i) => i !== itemIndex));
      setBuilt(nextBuilt);
      advanceIfComplete(nextBuilt);
      return;
    }
    setBuilt((prev) => prev.filter((_, i) => i !== itemIndex));
    setPool((prev) => [...prev, syllable]);
  };

  const startGame = () => {
    setPool(words[0] ? shuffleSyllables(words[0].syllables) : []);
    setStarted(true);
  };

  const restart = () => {
    setNonce((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setIndex(0);
    setBuilt([]);
    setPool(words[0]?.syllables ?? []);
    setCorrect(0);
    setAttempts(0);
  };

  return (
    <div className="space-y-5">
      <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-200/70 bg-white/80 p-5 dark:border-emerald-900/40 dark:bg-slate-950/70">
        {!started ? (
          <SimpleGameStartOverlay
            label="Start"
            buttonClassName="bg-linear-to-r from-emerald-500 to-teal-600"
            onStart={startGame}
          />
        ) : null}
        <div className={cn('relative z-0', !started && 'pointer-events-none')}>
          <p className="text-sm text-muted-foreground">
            Word {Math.min(index + 1, words.length)} of {words.length}
          </p>
          <div className="mt-4 min-h-14 rounded-2xl border border-dashed border-emerald-300/80 bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
            <div className="flex flex-wrap gap-2">
              {built.map((syllable, syllableIndex) => (
                <button
                  key={`built-${syllableIndex}`}
                  type="button"
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xl text-white"
                  onClick={() => take(syllable, false, syllableIndex)}
                >
                  <Label text={syllable} />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {pool.map((syllable, syllableIndex) => (
              <button
                key={`pool-${syllableIndex}`}
                type="button"
                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xl dark:border-emerald-800 dark:bg-slate-900"
                onClick={() => take(syllable, true, syllableIndex)}
              >
                <Label text={syllable} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {completed ? (
        <div className="rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-5 dark:border-emerald-900/50 dark:from-emerald-950/40">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-emerald-500" />
            All words unscrambled
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
