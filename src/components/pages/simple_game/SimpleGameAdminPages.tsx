'use client';

import { ArrowLeftIcon, BarChart3Icon } from 'lucide-react';
import { SimpleGameAddDialog } from './SimpleGameAddDialog';
import { SimpleGameAnalytics } from './SimpleGameAnalytics';
import { SIMPLE_GAME_ICONS } from './simple_game_icons';
import { SimpleGameListPage } from './SimpleGameListPage';
import {
  SIMPLE_GAME_META,
  simpleGameAnalyticsHref,
  simpleGameListHref,
  simpleGameViewHref,
  type SimpleGameKind
} from '~/util/games/kinds';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { FaPlay } from 'react-icons/fa';
import { IoMdArrowRoundBack } from 'react-icons/io';

const backLinkClass =
  'inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800';

export function SimpleGameListRoutePage({ kind }: { kind: SimpleGameKind }) {
  const meta = SIMPLE_GAME_META[kind];
  const Icon = SIMPLE_GAME_ICONS[kind];
  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
      <div className="px-2">
        <a href="/admin" className={backLinkClass}>
          <ArrowLeftIcon className="size-4 shrink-0" />
          Admin
        </a>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
              meta.accent.from,
              meta.accent.to
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{meta.name}</h1>
            <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            render={
              <a href={simpleGameAnalyticsHref(kind)} className="inline-flex items-center gap-2" />
            }
            nativeButton={false}
            variant="outline"
            className="text-base font-semibold"
          >
            <BarChart3Icon className="size-4 shrink-0" />
            Analytics
          </Button>
          <SimpleGameAddDialog kind={kind} />
        </div>
      </div>
      <SimpleGameListPage kind={kind} />
    </div>
  );
}

export function SimpleGameAnalyticsRoutePage({ kind }: { kind: SimpleGameKind }) {
  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 flex flex-wrap gap-2 px-2">
        <a href="/analytics" className={backLinkClass}>
          <BarChart3Icon className="size-4 shrink-0" />
          All Analytics
        </a>
        <a href={simpleGameListHref(kind)} className={backLinkClass}>
          <ArrowLeftIcon className="size-4 shrink-0" />
          Puzzle List
        </a>
      </div>
      <SimpleGameAnalytics kind={kind} />
    </div>
  );
}

export function SimpleGameEditHeader({ kind, uid }: { kind: SimpleGameKind; uid: string }) {
  return (
    <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
      <a
        href={simpleGameListHref(kind)}
        className="inline-flex items-center gap-1.5 text-lg font-semibold"
      >
        <IoMdArrowRoundBack className="size-5 shrink-0" />
        Main List
      </a>
      <a
        href={simpleGameViewHref(kind, uid)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-lg font-semibold"
        title="For sharing unlisted puzzles and internal testing. This page is not the public listed URL."
      >
        <FaPlay className="size-4 shrink-0" />
        Preview Puzzle
      </a>
    </div>
  );
}
