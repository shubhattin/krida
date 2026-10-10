'use client';

import { useContext, useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { MediaAttachments } from '~/components/pages/puzzle/MediaAttachments';
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
  children
}: {
  kind: SimpleGameKind;
  puzzleId: number;
  title: string;
  description: string;
  attachments: z.infer<typeof attachment_schema>[];
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {meta.nameDev} · {meta.subtitle}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{titleText}</h1>
        </div>
        <ScriptSelector script={script} onScriptChange={setScript} />
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
