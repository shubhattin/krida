'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import pretty_ms from 'pretty-ms';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import { inferAnveshiPuzzleData } from '~/util/anveshi/infer';
import type { location_list_type } from '~/db/types';
import { SimpleGameMetrics } from '~/components/pages/simple_game/SimpleGameMetrics';
import { SimpleGameStartOverlay } from '~/components/pages/simple_game/SimpleGameStartOverlay';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';

function Label({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
}

export function AnveshiPlay({
  puzzleId,
  location,
  data
}: {
  puzzleId: number;
  location: location_list_type;
  data: AnveshiPuzzleData;
}) {
  const questions = useMemo(
    () =>
      inferAnveshiPuzzleData(data).questions.filter(
        (question) =>
          question.prompt.trim().length > 0 &&
          question.options.length >= 2 &&
          question.options.every((option) => option.text.trim().length > 0)
      ),
    [data]
  );
  const [nonce, setNonce] = useState(0);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const current = questions[index];

  useEffect(() => {
    if (!started || completed) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [completed, started]);

  const choose = (optionId: string) => {
    if (!started || completed || picked || !current) return;
    setPicked(optionId);
    setAttempts((value) => value + 1);
    if (optionId === current.correctOptionId) setCorrect((value) => value + 1);
  };

  const next = () => {
    if (!current) return;
    if (index + 1 >= questions.length) {
      setCompleted(true);
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
    setHintOpen(false);
  };

  const restart = () => {
    setNonce((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setIndex(0);
    setPicked(null);
    setHintOpen(false);
    setCorrect(0);
    setAttempts(0);
  };

  return (
    <div className="space-y-5">
      <div className="relative isolate overflow-hidden rounded-3xl border border-sky-200/70 bg-white/80 p-5 dark:border-sky-900/40 dark:bg-slate-950/70">
        {!started ? (
          <SimpleGameStartOverlay
            label="Start"
            buttonClassName="bg-linear-to-r from-sky-500 to-indigo-600"
            onStart={() => setStarted(true)}
          />
        ) : null}
        <div className={cn('relative z-0 space-y-4', !started && 'pointer-events-none')}>
          <p className="text-sm text-muted-foreground">
            Question {Math.min(index + 1, questions.length)} of {questions.length}
          </p>
          <h2 className="text-2xl leading-snug font-bold">
            <Label text={current?.prompt ?? ''} />
          </h2>
          {current?.hint ? (
            <div>
              <Button size="sm" variant="ghost" onClick={() => setHintOpen((value) => !value)}>
                <Lightbulb className="size-4 text-amber-500" />
                {hintOpen ? 'Hide hint' : 'Show hint'}
              </Button>
              {hintOpen ? (
                <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <Label text={current.hint} />
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-2">
            {(current?.options ?? []).map((option, optionIndex) => {
              const chosen = picked === option.id;
              const revealCorrect = Boolean(picked) && option.id === current?.correctOptionId;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={Boolean(picked)}
                  onClick={() => choose(option.id)}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left text-lg transition-all',
                    revealCorrect
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                      : chosen
                        ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40'
                        : 'border-border/70 hover:border-sky-300'
                  )}
                >
                  <span className="mr-2 text-sm font-semibold text-muted-foreground">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>
                  <Label text={option.text} />
                </button>
              );
            })}
          </div>
          {picked && current?.explanation ? (
            <p className="rounded-2xl bg-sky-50 px-3 py-2 text-sm dark:bg-sky-950/40">
              <Label text={current.explanation} />
            </p>
          ) : null}
          {picked ? (
            <Button onClick={next} className="bg-linear-to-r from-sky-500 to-indigo-600 text-white">
              {index + 1 >= questions.length ? 'See results' : 'Next question'}
            </Button>
          ) : null}
        </div>
      </div>
      {completed ? (
        <div className="rounded-3xl border border-sky-200 bg-linear-to-br from-sky-50 to-indigo-50 p-5 dark:border-sky-900/50 dark:from-sky-950/40">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-sky-500" />
            Quiz complete
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
        kind="anveshi"
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
