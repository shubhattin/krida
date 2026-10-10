'use client';

import { useContext } from 'react';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { SIMPLE_GAME_META, simpleGameHref, type SimpleGameKind } from '~/util/games/kinds';
import { cn } from '~/lib/utils';
import type { SimpleListedPuzzle } from '~/util/cache.server/simple_game_cache';
import { useTransliteratedText } from './useTransliteratedText';

function Title({ text }: { text: string }) {
  return <>{useTransliteratedText(text)}</>;
}

export function SimpleGameLanding({
  kind,
  puzzles
}: {
  kind: SimpleGameKind;
  puzzles: SimpleListedPuzzle[];
}) {
  const meta = SIMPLE_GAME_META[kind];
  const { script, setScript } = useContext(AppContext);

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-10 -top-8 h-44 rounded-full blur-3xl',
          meta.accent.glow
        )}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">{meta.name}</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">{meta.description}</p>
        </div>
        <ScriptSelector script={script} onScriptChange={setScript} />
      </div>
      {puzzles.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No listed {meta.name} puzzles yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {puzzles.map((puzzle) => (
            <a
              key={puzzle.id}
              href={simpleGameHref(kind, puzzle.slug)}
              className={cn(
                'rounded-2xl border bg-linear-to-br p-5 no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                meta.accent.border,
                meta.accent.wash
              )}
            >
              <h2 className="text-lg font-semibold text-foreground">
                <Title text={puzzle.title} />
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                <Title text={puzzle.description} />
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
