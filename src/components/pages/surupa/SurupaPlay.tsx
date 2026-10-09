'use client';

import { useEffect, useMemo, useState } from 'react';
import { Play, RotateCcw, Sparkles } from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { SurupaPuzzleData } from '~/util/surupa/data';
import { inferSurupaPuzzleData } from '~/util/surupa/infer';
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

function Glyph({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
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
  const words = useMemo(() => inferSurupaPuzzleData(data).words, [data]);
  const [nonce, setNonce] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const current = words[wordIndex];
  const choices = useMemo(
    () =>
      (current?.syllables ?? []).map((syllable, index) =>
        shuffle([syllable, ...(current?.alternatives[index] ?? [])].filter(Boolean))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, nonce, wordIndex]
  );

  useEffect(() => {
    setPicks(Array.from({ length: current?.syllables.length ?? 0 }, () => ''));
  }, [current, nonce, wordIndex]);

  useEffect(() => {
    if (!started || completed) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [completed, started]);

  const choose = (syllableIndex: number, value: string) => {
    if (!started || completed || !current) return;
    setAttempts((count) => count + 1);
    const next = picks.map((item, index) => (index === syllableIndex ? value : item));
    setPicks(next);
    if (value === current.syllables[syllableIndex]) setCorrect((count) => count + 1);
    const done = current.syllables.every((syllable, index) => next[index] === syllable);
    if (!done) return;
    if (wordIndex + 1 >= words.length) {
      setCompleted(true);
      return;
    }
    setWordIndex((index) => index + 1);
  };

  const restart = () => {
    setNonce((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setWordIndex(0);
    setCorrect(0);
    setAttempts(0);
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-violet-200/70 bg-white/80 p-5 dark:border-violet-900/40 dark:bg-slate-950/70">
        {!started ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px] dark:bg-slate-950/70">
            <Button
              size="lg"
              className="bg-linear-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg"
              onClick={() => setStarted(true)}
            >
              <Play className="size-5" />
              Start
            </Button>
          </div>
        ) : null}
        <div className={cn('space-y-4', !started && 'pointer-events-none')}>
          <p className="text-sm text-muted-foreground">
            Word {Math.min(wordIndex + 1, words.length)} of {words.length}
          </p>
          <div className="flex flex-wrap gap-2 text-2xl font-bold">
            {(current?.syllables ?? []).map((syllable, index) => (
              <span
                key={`${syllable}-${index}`}
                className={cn(
                  'min-w-12 rounded-xl border px-3 py-2 text-center',
                  picks[index] === syllable
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-dashed'
                )}
              >
                {picks[index] ? <Glyph text={picks[index]!} /> : '·'}
              </span>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {choices.map((options, syllableIndex) => (
              <div
                key={syllableIndex}
                className="max-h-40 overflow-y-auto rounded-2xl border border-violet-200/60 p-2 dark:border-violet-900/40"
              >
                <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Syllable {syllableIndex + 1}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={picks[syllableIndex] === current?.syllables[syllableIndex]}
                      onClick={() => choose(syllableIndex, option)}
                      className="rounded-lg border px-2 py-1 text-lg hover:border-violet-400"
                    >
                      <Glyph text={option} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {completed ? (
        <div className="rounded-3xl border border-violet-200 bg-linear-to-br from-violet-50 to-fuchsia-50 p-5 dark:border-violet-900/50 dark:from-violet-950/40">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-violet-500" />
            Spelling restored
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
