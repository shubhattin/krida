'use client';

import { ArrowLeftIcon, BarChart3Icon } from 'lucide-react';
import { SimpleGameAddDialog } from './SimpleGameAddDialog';
import { SimpleGameAnalytics } from './SimpleGameAnalytics';
import { SimpleGameListPage } from './SimpleGameListPage';
import {
  SIMPLE_GAME_META,
  simpleGameAnalyticsHref,
  simpleGameListHref,
  simpleGameViewHref,
  type SimpleGameKind
} from '~/util/games/kinds';
import { Button } from '~/components/ui/button';
import { FaPlay } from 'react-icons/fa';
import { IoMdArrowRoundBack } from 'react-icons/io';

const backLinkClass =
  'inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800';

export function SimpleGameListRoutePage({ kind }: { kind: SimpleGameKind }) {
  const meta = SIMPLE_GAME_META[kind];
  return (
    <div className="container mx-auto p-4">
      <div className="my-2 mb-4 px-2">
        <a href="/admin" className={backLinkClass}>
          <ArrowLeftIcon className="size-4 shrink-0" />
          Admin
        </a>
      </div>
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-center gap-4 px-2">
        <h1 className="w-full text-center text-2xl font-bold tracking-tight">
          {meta.nameDev} · {meta.name}
        </h1>
        <Button
          render={<a href={simpleGameAnalyticsHref(kind)} className="inline-flex items-center gap-2" />}
          nativeButton={false}
          variant="outline"
          className="text-base font-semibold"
        >
          <BarChart3Icon className="size-4 shrink-0" />
          Analytics
        </Button>
        <SimpleGameAddDialog kind={kind} />
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

export function SimpleGameEditHeader({
  kind,
  uid
}: {
  kind: SimpleGameKind;
  uid: string;
}) {
  return (
    <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
      <a href={simpleGameListHref(kind)} className="inline-flex items-center gap-1.5 text-lg font-semibold">
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
