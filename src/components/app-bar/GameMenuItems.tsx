'use client';

import Link from 'next/link';
import { Calendar, List, Pencil, BarChart3, Images } from 'lucide-react';
import { useAtom } from 'jotai';
import { active_puzzle_id_atom } from '~/components/pages/padavali/WordGame/game_state';
import { active_crossword_id_atom } from '~/components/pages/cross_word/CrossWordGame/game_state';
import { useSession } from '~/lib/auth-client';

const accountMenuLinkClass =
  'flex min-w-0 w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50';

const accountMenuIconClass =
  'flex size-5 shrink-0 items-center justify-center rounded-md bg-linear-to-br';

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
          <div className={`${accountMenuIconClass} from-amber-500 to-orange-600`}>
            <Pencil className="size-3 text-white" />
          </div>
          <span className="truncate">Edit #{activePuzzleId}</span>
        </Link>
      )}
      <Link href="/padavali/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-purple-500 to-violet-600`}>
          <List className="size-3 text-white" />
        </div>
        <span className="truncate">List</span>
      </Link>
      <Link href="/padavali/schedules" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-emerald-500 to-teal-600`}>
          <Calendar className="size-3 text-white" />
        </div>
        <span className="truncate">Schedules</span>
      </Link>
      <Link href="/padavali/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-sky-500 to-blue-600`}>
          <BarChart3 className="size-3 text-white" />
        </div>
        <span className="truncate">Analytics</span>
      </Link>
      <Link href="/padavali/batch_manager" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-fuchsia-500 to-pink-600`}>
          <Images className="size-3 text-white" />
        </div>
        <span className="truncate">Batches</span>
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
          <div className={`${accountMenuIconClass} from-amber-500 to-orange-600`}>
            <Pencil className="size-3 text-white" />
          </div>
          <span className="truncate">Edit #{activeCrosswordId}</span>
        </Link>
      )}
      <Link href="/padajala/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-purple-500 to-violet-600`}>
          <List className="size-3 text-white" />
        </div>
        <span className="truncate">List</span>
      </Link>
      <Link href="/padajala/schedules" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-emerald-500 to-teal-600`}>
          <Calendar className="size-3 text-white" />
        </div>
        <span className="truncate">Schedules</span>
      </Link>
      <Link href="/padajala/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-sky-500 to-blue-600`}>
          <BarChart3 className="size-3 text-white" />
        </div>
        <span className="truncate">Analytics</span>
      </Link>
      <Link href="/padajala/batch_manager" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-fuchsia-500 to-pink-600`}>
          <Images className="size-3 text-white" />
        </div>
        <span className="truncate">Batches</span>
      </Link>
    </>
  );
}

export { accountMenuLinkClass, accountMenuIconClass };
