'use client';

import Link from 'next/link';
import { Calendar, List, Pencil, BarChart3, Images } from 'lucide-react';
import { useAtom } from 'jotai';
import { active_puzzle_id_atom } from '~/components/pages/padavali/WordGame/game_state';
import { active_crossword_id_atom } from '~/components/pages/cross_word/CrossWordGame/game_state';
import { useSession } from '~/lib/auth-client';

const accountMenuLinkClass =
  'flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50';

export function PadavaliMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const user_info = useSession().data?.user;
  const [activePuzzleId] = useAtom(active_puzzle_id_atom);
  if (!user_info || user_info.role !== 'admin') return null;

  return (
    <>
      {activePuzzleId != null && (
        <Link
          href={`/padavali/edit/${activePuzzleId}`}
          onClick={onNavigate}
          className={accountMenuLinkClass}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600">
            <Pencil className="size-4 text-white" />
          </div>
          <div>
            <div className="font-medium">Edit Current Puzzle</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Open puzzle #{activePuzzleId} in editor
            </div>
          </div>
        </Link>
      )}
      <Link href="/padavali/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-violet-600">
          <List className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Puzzle List</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Admin puzzle list</div>
        </div>
      </Link>
      <Link href="/padavali/schedules" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600">
          <Calendar className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Schedules</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Manage schedules</div>
        </div>
      </Link>
      <Link href="/padavali/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-blue-600">
          <BarChart3 className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Analytics</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Gameplay stats</div>
        </div>
      </Link>
      <Link href="/padavali/batch_manager" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-500 to-pink-600">
          <Images className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Batch Manager</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">AI image batches</div>
        </div>
      </Link>
    </>
  );
}

export function CrosswordMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const user_info = useSession().data?.user;
  const [activeCrosswordId] = useAtom(active_crossword_id_atom);
  if (!user_info || user_info.role !== 'admin') return null;

  return (
    <>
      {activeCrosswordId != null && (
        <Link
          href={`/padajala/edit/${activeCrosswordId}`}
          onClick={onNavigate}
          className={accountMenuLinkClass}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600">
            <Pencil className="size-4 text-white" />
          </div>
          <div>
            <div className="font-medium">Edit Current Puzzle</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Open crossword #{activeCrosswordId} in editor
            </div>
          </div>
        </Link>
      )}
      <Link href="/padajala/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-violet-600">
          <List className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Puzzle List</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Admin crossword list</div>
        </div>
      </Link>
      <Link href="/padajala/schedules" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600">
          <Calendar className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Schedules</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Manage schedules</div>
        </div>
      </Link>
      <Link href="/padajala/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-blue-600">
          <BarChart3 className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Analytics</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Gameplay stats</div>
        </div>
      </Link>
      <Link href="/padajala/batch_manager" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-500 to-pink-600">
          <Images className="size-4 text-white" />
        </div>
        <div>
          <div className="font-medium">Batch Manager</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">AI image batches</div>
        </div>
      </Link>
    </>
  );
}

export { accountMenuLinkClass };
