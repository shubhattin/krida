'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Flag, Lightbulb, Sparkles, X } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { AnveshiOption, AnveshiPuzzleData, AnveshiQuestion } from '~/util/anveshi/data';
import { inferAnveshiPuzzleData } from '~/util/anveshi/infer';
import type { location_list_type } from '~/db/types';
import { SimpleGameMetrics } from '~/components/pages/simple_game/SimpleGameMetrics';
import { SimpleGameStartOverlay } from '~/components/pages/simple_game/SimpleGameStartOverlay';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';
import { GameHud } from '~/components/pages/simple_game/play/GameHud';
import { GameCompletion } from '~/components/pages/simple_game/play/GameCompletion';
import { MorePuzzles } from '~/components/pages/simple_game/play/MorePuzzles';
import { CollectionUpNext } from '~/components/pages/puzzle/CollectionUpNext';
import { useGameClock } from '~/components/pages/simple_game/play/useGameClock';
import { playGradient, SHAKE_TRANSITION, SHAKE_X } from '~/components/pages/simple_game/play/theme';

function Label({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
}

const letter = (index: number) => String.fromCharCode(65 + index);

/** A–Z / 1–9 answer, ← → navigate, Enter advances. Ignored while typing in fields. */
function useQuizKeys(
  question: AnveshiQuestion | null,
  actions: { prev: () => void; next: () => void; pick: (optionId: string) => void }
) {
  useEffect(() => {
    if (!question) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'arrowleft') actions.prev();
      else if (key === 'arrowright') actions.next();
      else if (key === 'enter') actions.next();
      else {
        const byLetter = key.length === 1 ? key.charCodeAt(0) - 97 : -1;
        const pick = byLetter >= 0 && byLetter < 26 ? byLetter : Number(key) - 1;
        const option = question.options[pick];
        if (option) actions.pick(option.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
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
  const [seconds, setSeconds] = useGameClock(started && !completed);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Set<string>>(new Set());
  const current = questions[index];
  const playing = started && !completed;

  const answeredCount = Object.keys(answers).length;
  const correct = questions.filter((q) => answers[q.id] === q.correctOptionId).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  const goTo = (next: number) => {
    if (next < 0 || next >= questions.length || next === index) return;
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  const answer = (optionId: string) => {
    if (!playing || !current || answers[current.id]) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
  };

  const nextUnanswered = () => {
    for (let step = 1; step <= questions.length; step++) {
      const candidate = (index + step) % questions.length;
      if (!answers[questions[candidate]!.id]) return candidate;
    }
    return null;
  };

  /** Forward, wrapping to the first unanswered question once past the end. */
  const advance = () => {
    if (index < questions.length - 1) {
      goTo(index + 1);
      return;
    }
    const pending = nextUnanswered();
    if (pending !== null) goTo(pending);
    else setCompleted(true);
  };

  useQuizKeys(playing && current ? current : null, {
    prev: () => goTo(index - 1),
    next: () => {
      if (current && answers[current.id]) advance();
    },
    pick: answer
  });

  const restart = () => {
    setNonce((value) => value + 1);
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    setIndex(0);
    setDirection(1);
    setAnswers({});
    setHints(new Set());
  };

  const picked = current ? answers[current.id] : undefined;
  const isLast = index === questions.length - 1;

  return (
    <div className="space-y-5">
      {completed ? null : (
        <div className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-2/3 -translate-x-1/2 rounded-full bg-linear-to-r from-sky-500 to-indigo-500 opacity-[0.12] blur-3xl" />
          {!started ? (
            <SimpleGameStartOverlay kind="anveshi" onStart={() => setStarted(true)} />
          ) : null}
          <div className="mb-4">
            <GameHud
              kind="anveshi"
              label={`Question ${Math.min(index + 1, questions.length)} of ${questions.length}`}
              done={answeredCount}
              total={questions.length}
              seconds={seconds}
              mistakes={answeredCount - correct}
            />
          </div>

          <div className={cn(!started && 'pointer-events-none blur-sm')}>
            <QuestionDots questions={questions} answers={answers} index={index} onGo={goTo} />

            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                {current ? (
                  <motion.div
                    key={current.id}
                    custom={direction}
                    initial={{ opacity: 0, x: direction * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <QuestionView
                      question={current}
                      picked={picked}
                      hintOpen={hints.has(current.id)}
                      disabled={!playing}
                      onToggleHint={() =>
                        setHints((prev) => {
                          const next = new Set(prev);
                          if (next.has(current.id)) next.delete(current.id);
                          else next.add(current.id);
                          return next;
                        })
                      }
                      onAnswer={answer}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <QuizNav
              canGoBack={index > 0}
              picked={Boolean(picked)}
              isLast={isLast}
              allAnswered={allAnswered && !completed}
              canSkip={nextUnanswered() !== null}
              onBack={() => goTo(index - 1)}
              onAdvance={advance}
              onFinish={() => setCompleted(true)}
            />
            <p className="mt-3 hidden text-center text-xs text-muted-foreground sm:block">
              Keys: A–{letter(Math.max(0, (current?.options.length ?? 1) - 1))} to answer · ← → to
              move · Enter for next
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {completed ? (
          <GameCompletion
            kind="anveshi"
            title={`${correct} of ${questions.length} correct`}
            seconds={seconds}
            correct={correct}
            attempts={answeredCount}
            onRestart={restart}
          >
            <ReviewList questions={questions} answers={answers} />
          </GameCompletion>
        ) : null}
      </AnimatePresence>
      {completed ? (
        <div className="flex flex-col gap-4">
          <CollectionUpNext />
          <MorePuzzles kind="anveshi" puzzleId={puzzleId} />
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
        totalAttempts={answeredCount}
        sessionNonce={nonce}
      />
    </div>
  );
}

function QuizNav({
  canGoBack,
  picked,
  isLast,
  allAnswered,
  canSkip,
  onBack,
  onAdvance,
  onFinish
}: {
  canGoBack: boolean;
  picked: boolean;
  isLast: boolean;
  allAnswered: boolean;
  canSkip: boolean;
  onBack: () => void;
  onAdvance: () => void;
  onFinish: () => void;
}) {
  const forwardLabel = !picked ? 'Skip' : isLast ? 'Next unanswered' : 'Next';
  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <button
        type="button"
        disabled={!canGoBack}
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
        Previous
      </button>
      {allAnswered ? (
        <motion.button
          type="button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onFinish}
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/25"
          style={{ backgroundImage: playGradient('anveshi') }}
        >
          <Flag className="size-4" />
          See results
        </motion.button>
      ) : null}
      {allAnswered && isLast ? (
        <span />
      ) : (
        <button
          type="button"
          disabled={!picked && !canSkip}
          onClick={onAdvance}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-40',
            picked
              ? 'text-white shadow-md'
              : 'border border-border/70 text-muted-foreground hover:text-foreground'
          )}
          style={picked ? { backgroundImage: playGradient('anveshi') } : undefined}
        >
          {forwardLabel}
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}

function QuestionDots({
  questions,
  answers,
  index,
  onGo
}: {
  questions: AnveshiQuestion[];
  answers: Record<string, string>;
  index: number;
  onGo: (index: number) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-1.5">
      {questions.map((question, questionIndex) => {
        const chosen = answers[question.id];
        const state = !chosen ? 'open' : chosen === question.correctOptionId ? 'right' : 'wrong';
        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onGo(questionIndex)}
            aria-label={`Go to question ${questionIndex + 1}`}
            aria-current={questionIndex === index ? 'step' : undefined}
            className={cn(
              'flex size-8 items-center justify-center rounded-full border text-xs font-bold tabular-nums transition-all',
              state === 'right' && 'border-emerald-500 bg-emerald-500 text-white',
              state === 'wrong' && 'border-red-500 bg-red-500 text-white',
              state === 'open' &&
                'border-border bg-background/60 text-muted-foreground hover:border-sky-400',
              questionIndex === index &&
                'ring-2 ring-sky-400/70 ring-offset-2 ring-offset-background'
            )}
          >
            {state === 'right' ? (
              <Check className="size-3.5" strokeWidth={3} />
            ) : state === 'wrong' ? (
              <X className="size-3.5" strokeWidth={3} />
            ) : (
              questionIndex + 1
            )}
          </button>
        );
      })}
    </div>
  );
}

function QuestionView({
  question,
  picked,
  hintOpen,
  disabled,
  onToggleHint,
  onAnswer
}: {
  question: AnveshiQuestion;
  picked: string | undefined;
  hintOpen: boolean;
  disabled: boolean;
  onToggleHint: () => void;
  onAnswer: (optionId: string) => void;
}) {
  const wasRight = picked === question.correctOptionId;
  return (
    <div className="space-y-4">
      <h2 className="text-xl leading-snug font-bold sm:text-2xl">
        <Label text={question.prompt} />
      </h2>
      {question.hint && !picked ? (
        <div>
          <button
            type="button"
            onClick={onToggleHint}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
          >
            <Lightbulb className="size-3.5" />
            {hintOpen ? 'Hide hint' : 'Need a hint?'}
          </button>
          <AnimatePresence>
            {hintOpen ? (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <span className="mt-2 block rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  <Label text={question.hint} />
                </span>
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => (
          <OptionButton
            key={option.id}
            option={option}
            index={optionIndex}
            state={
              !picked
                ? 'open'
                : option.id === question.correctOptionId
                  ? 'right'
                  : option.id === picked
                    ? 'wrong'
                    : 'dim'
            }
            disabled={disabled || Boolean(picked)}
            onPick={() => onAnswer(option.id)}
          />
        ))}
      </div>
      <AnimatePresence>
        {picked ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cn(
              'rounded-2xl border px-4 py-3',
              wasRight
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-red-500/40 bg-red-500/10'
            )}
          >
            <p
              className={cn(
                'flex items-center gap-1.5 text-sm font-bold',
                wasRight
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              )}
            >
              {wasRight ? <Sparkles className="size-4" /> : <X className="size-4" />}
              {wasRight ? 'Correct!' : 'Not quite.'}
            </p>
            {question.explanation ? (
              <p className="mt-1 text-sm text-foreground/85">
                <Label text={question.explanation} />
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function OptionButton({
  option,
  index,
  state,
  disabled,
  onPick
}: {
  option: AnveshiOption;
  index: number;
  state: 'open' | 'right' | 'wrong' | 'dim';
  disabled: boolean;
  onPick: () => void;
}) {
  const [scope, animate] = useAnimate<HTMLButtonElement>();

  useEffect(() => {
    if (!scope.current) return;
    if (state === 'wrong') void animate(scope.current, { x: SHAKE_X }, SHAKE_TRANSITION);
    if (state === 'right') void animate(scope.current, { scale: [1, 1.04, 1] }, { duration: 0.35 });
  }, [animate, scope, state]);

  return (
    <motion.button
      ref={scope}
      type="button"
      disabled={disabled}
      onClick={onPick}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left text-base font-semibold transition-colors duration-200 sm:text-lg',
        state === 'open' &&
          'border-border/70 bg-background/60 hover:border-sky-400/70 hover:bg-sky-500/5',
        state === 'right' && 'border-emerald-500 bg-emerald-500/12 shadow-lg shadow-emerald-500/15',
        state === 'wrong' && 'border-red-500 bg-red-500/12',
        state === 'dim' && 'border-border/50 opacity-50'
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-colors',
          state === 'open' &&
            'bg-muted text-muted-foreground group-hover:bg-sky-500 group-hover:text-white',
          state === 'right' && 'bg-emerald-500 text-white',
          state === 'wrong' && 'bg-red-500 text-white',
          state === 'dim' && 'bg-muted text-muted-foreground'
        )}
      >
        {state === 'right' ? (
          <Check className="size-4" strokeWidth={3} />
        ) : state === 'wrong' ? (
          <X className="size-4" strokeWidth={3} />
        ) : (
          letter(index)
        )}
      </span>
      <span className="min-w-0 flex-1 break-words">
        <Label text={option.text} />
      </span>
    </motion.button>
  );
}

function ReviewList({
  questions,
  answers
}: {
  questions: AnveshiQuestion[];
  answers: Record<string, string>;
}) {
  return (
    <ol className="space-y-2">
      {questions.map((question, index) => {
        const chosen = question.options.find((option) => option.id === answers[question.id]);
        const right = question.options.find((option) => option.id === question.correctOptionId);
        const ok = chosen?.id === right?.id;
        return (
          <li
            key={question.id}
            className="flex gap-3 rounded-2xl border border-border/60 bg-background/50 px-3 py-2.5"
          >
            <span
              className={cn(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white',
                ok ? 'bg-emerald-500' : 'bg-red-500'
              )}
            >
              {ok ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <X className="size-3.5" strokeWidth={3} />
              )}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                {index + 1}. <Label text={question.prompt} />
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {ok ? null : (
                  <>
                    <span className="text-red-600 line-through dark:text-red-400">
                      <Label text={chosen?.text ?? '—'} />
                    </span>{' '}
                    →{' '}
                  </>
                )}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  <Label text={right?.text ?? ''} />
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
