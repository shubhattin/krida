'use client';

import { useContext, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { MediaAttachments } from '~/components/pages/puzzle/MediaAttachments';
import { PuzzleBackLink } from '~/components/pages/puzzle/PuzzleBackLink';
import { active_simple_game_id_atom } from '~/components/app-bar/GameMenuItems';
import { SIMPLE_GAME_META, type SimpleGameKind } from '~/util/games/kinds';
import { cn } from '~/lib/utils';
import type { z } from 'zod';
import type { attachment_schema } from '~/db/db_shared_vals';
import { useTransliteratedText } from './useTransliteratedText';

export function SimpleGamePublicShell({
  kind,
  puzzleId,
  title,
  description,
  attachments,
  showBackLink,
  children
}: {
  kind: SimpleGameKind;
  puzzleId: number;
  title: string;
  description: string;
  attachments: z.infer<typeof attachment_schema>[];
  /** "All puzzles" link back to this game's catalog (public puzzle pages, not previews). */
  showBackLink: boolean;
  children: React.ReactNode;
}) {
  const meta = SIMPLE_GAME_META[kind];
  const { script, setScript } = useContext(AppContext);
  const titleText = useTransliteratedText(title);
  const descriptionText = useTransliteratedText(description);
  const setActive = useSetAtom(active_simple_game_id_atom);

  useEffect(() => {
    setActive({ kind, id: puzzleId });
    return () => setActive(null);
  }, [kind, puzzleId, setActive]);

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-8 -top-10 h-40 rounded-full blur-3xl',
          meta.accent.glow
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showBackLink ? (
            <div className="mb-1">
              <PuzzleBackLink game={kind} />
            </div>
          ) : null}
          <p className="text-sm font-medium text-muted-foreground">
            {meta.name} · {meta.subtitle}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight break-words sm:text-3xl">
            {titleText}
          </h1>
        </div>
        <div className="shrink-0 pt-0.5">
          <ScriptSelector script={script} onScriptChange={setScript} compact />
        </div>
      </div>
      {descriptionText ? (
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          {descriptionText}
        </p>
      ) : null}
      {attachments.length > 0 ? <MediaAttachments attachments={attachments} /> : null}
      {children}
    </div>
  );
}
