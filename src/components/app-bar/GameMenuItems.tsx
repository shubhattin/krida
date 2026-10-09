'use client';

import { Link } from '@tanstack/react-router';
import {
  ArrowLeftRight,
  Calendar,
  ChartNoAxesCombined,
  CircleHelp,
  List,
  Pencil,
  BarChart3,
  Images,
  Layers,
  Tag,
  Shield,
  Shuffle,
  SpellCheck
} from 'lucide-react';
import { atom, useAtom } from 'jotai';
import {
  simpleGameAnalyticsHref,
  simpleGameEditHref,
  simpleGameListHref,
  SIMPLE_GAME_META,
  type SimpleGameKind
} from '~/util/games/kinds';
import { active_puzzle_id_atom } from '~/components/pages/padavali/WordGame/game_state';
import { active_crossword_id_atom } from '~/components/pages/cross_word/CrossWordGame/game_state';
import { active_collection_atom } from '~/components/pages/catalog/catalog_admin_state';
import { useSession } from '~/lib/auth-client';
import { cn } from '~/lib/utils';

const accountMenuLinkClass =
  'flex min-w-0 w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700/50';

const accountMenuIconClass =
  'flex size-5 shrink-0 items-center justify-center rounded-md bg-linear-to-br';

function useIsAdmin() {
  const user = useSession().data?.user;
  return !!user && user.role === 'admin';
}

/** Primary entry to the central `/admin` hub. */
export function AdminPageMenuLink({
  onNavigate,
  prominent = false
}: {
  onNavigate?: () => void;
  /** Full-width, slightly taller treatment for hub pages. */
  prominent?: boolean;
}) {
  if (!useIsAdmin()) return null;

  return (
    <Link
      to="/admin"
      onClick={onNavigate}
      className={cn(
        accountMenuLinkClass,
        prominent && 'col-span-2 gap-2.5 px-3 py-2.5 text-sm font-semibold'
      )}
    >
      <div
        className={cn(
          accountMenuIconClass,
          'from-blue-500 to-indigo-600',
          prominent && 'size-7 rounded-lg'
        )}
      >
        <Shield className={cn('text-white', prominent ? 'size-3.5' : 'size-3')} />
      </div>
      <span className="min-w-0 truncate">
        {prominent ? 'Admin' : 'Admin hub'}
        {prominent ? (
          <span className="mt-0.5 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
            Manage puzzles, analytics & catalog
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** Shared catalog pages — collections and tags span every game. */
export function CatalogAdminMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;

  return (
    <>
      <Link to="/collections/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-indigo-500 to-violet-600`}>
          <Layers className="size-3 text-white" />
        </div>
        <span className="truncate">Collections</span>
      </Link>
      <Link to="/tags/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-cyan-500 to-sky-600`}>
          <Tag className="size-3 text-white" />
        </div>
        <span className="truncate">Tags</span>
      </Link>
    </>
  );
}

/** Hub (`/`, `/puzzles`) — admin hub first, then cross-game shortcuts. */
export function AllGamesMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;

  return (
    <>
      <AdminPageMenuLink onNavigate={onNavigate} prominent />
      <Link to="/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-blue-500 to-indigo-600`}>
          <ChartNoAxesCombined className="size-3 text-white" />
        </div>
        <span className="truncate">All analytics</span>
      </Link>
      <Link to="/padavali/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-sky-500 to-blue-600`}>
          <BarChart3 className="size-3 text-white" />
        </div>
        <span className="truncate">Padāvalī</span>
      </Link>
      <Link to="/padajala/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-sky-500 to-blue-600`}>
          <BarChart3 className="size-3 text-white" />
        </div>
        <span className="truncate">Padajāla</span>
      </Link>
      <CatalogAdminMenuItems onNavigate={onNavigate} />
    </>
  );
}

/** "Edit collection" shortcut, visible only on a public collection page. */
export function CollectionAdminMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useIsAdmin();
  const [activeCollection] = useAtom(active_collection_atom);
  if (!isAdmin || !activeCollection) return null;

  return (
    <Link
      to="/collections/edit/$uid"
      params={{ uid: activeCollection.uid }}
      onClick={onNavigate}
      className={cn(accountMenuLinkClass, 'col-span-2')}
    >
      <div className={`${accountMenuIconClass} from-amber-500 to-orange-600`}>
        <Pencil className="size-3 text-white" />
      </div>
      <span className="truncate">Edit {activeCollection.title}</span>
    </Link>
  );
}

/** Padāvalī routes — edit current puzzle, admin hub, then game tools. */
export function PadavaliMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useIsAdmin();
  const [activePuzzleId] = useAtom(active_puzzle_id_atom);
  if (!isAdmin) return null;

  return (
    <>
      {activePuzzleId != null ? (
        <Link
          to="/padavali/edit/$id"
          params={{ id: String(activePuzzleId) }}
          onClick={onNavigate}
          className={cn(accountMenuLinkClass, 'col-span-2')}
        >
          <div className={`${accountMenuIconClass} from-amber-500 to-orange-600`}>
            <Pencil className="size-3 text-white" />
          </div>
          <span className="truncate">Edit puzzle #{activePuzzleId}</span>
        </Link>
      ) : null}
      <AdminPageMenuLink onNavigate={onNavigate} prominent />
      <Link to="/padavali/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-purple-500 to-violet-600`}>
          <List className="size-3 text-white" />
        </div>
        <span className="truncate">List</span>
      </Link>
      <Link to="/padavali/schedules" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-emerald-500 to-teal-600`}>
          <Calendar className="size-3 text-white" />
        </div>
        <span className="truncate">Schedules</span>
      </Link>
      <Link to="/padavali/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-sky-500 to-blue-600`}>
          <BarChart3 className="size-3 text-white" />
        </div>
        <span className="truncate">Analytics</span>
      </Link>
      <Link to="/padavali/batch_manager" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-fuchsia-500 to-pink-600`}>
          <Images className="size-3 text-white" />
        </div>
        <span className="truncate">Batches</span>
      </Link>
      <CatalogAdminMenuItems onNavigate={onNavigate} />
    </>
  );
}

/** Padajāla routes — edit current crossword, admin hub, then game tools. */
export function CrosswordMenuItems({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useIsAdmin();
  const [activeCrosswordId] = useAtom(active_crossword_id_atom);
  if (!isAdmin) return null;

  return (
    <>
      {activeCrosswordId != null ? (
        <Link
          to="/padajala/edit/$id"
          params={{ id: String(activeCrosswordId) }}
          onClick={onNavigate}
          className={cn(accountMenuLinkClass, 'col-span-2')}
        >
          <div className={`${accountMenuIconClass} from-amber-500 to-orange-600`}>
            <Pencil className="size-3 text-white" />
          </div>
          <span className="truncate">Edit puzzle #{activeCrosswordId}</span>
        </Link>
      ) : null}
      <AdminPageMenuLink onNavigate={onNavigate} prominent />
      <Link to="/padajala/list" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-purple-500 to-violet-600`}>
          <List className="size-3 text-white" />
        </div>
        <span className="truncate">List</span>
      </Link>
      <Link to="/padajala/schedules" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-emerald-500 to-teal-600`}>
          <Calendar className="size-3 text-white" />
        </div>
        <span className="truncate">Schedules</span>
      </Link>
      <Link to="/padajala/analytics" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-sky-500 to-blue-600`}>
          <BarChart3 className="size-3 text-white" />
        </div>
        <span className="truncate">Analytics</span>
      </Link>
      <Link to="/padajala/batch_manager" onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={`${accountMenuIconClass} from-fuchsia-500 to-pink-600`}>
          <Images className="size-3 text-white" />
        </div>
        <span className="truncate">Batches</span>
      </Link>
      <CatalogAdminMenuItems onNavigate={onNavigate} />
    </>
  );
}

export const active_simple_game_id_atom = atom<{ kind: SimpleGameKind; id: number } | null>(null);

const SIMPLE_MENU_ICON = {
  dvayi: ArrowLeftRight,
  bhramita: Shuffle,
  surupa: SpellCheck,
  anveshi: CircleHelp
} as const;

/** In-development games — list, analytics, and optional live-edit shortcut. */
export function SimpleGameMenuItems({
  kind,
  onNavigate
}: {
  kind: SimpleGameKind;
  onNavigate?: () => void;
}) {
  const isAdmin = useIsAdmin();
  const [active] = useAtom(active_simple_game_id_atom);
  if (!isAdmin) return null;

  const meta = SIMPLE_GAME_META[kind];
  const Icon = SIMPLE_MENU_ICON[kind];
  const accent = `${meta.accent.from} ${meta.accent.to}`;

  return (
    <>
      {active?.kind === kind ? (
        <a
          href={simpleGameEditHref(kind, active.id)}
          onClick={onNavigate}
          className={cn(accountMenuLinkClass, 'col-span-2')}
        >
          <div className={cn(accountMenuIconClass, 'bg-linear-to-br', accent)}>
            <Pencil className="size-3 text-white" />
          </div>
          <span className="truncate">Edit puzzle #{active.id}</span>
        </a>
      ) : null}
      <AdminPageMenuLink onNavigate={onNavigate} prominent />
      <a href={simpleGameListHref(kind)} onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={cn(accountMenuIconClass, 'bg-linear-to-br from-purple-500 to-violet-600')}>
          <List className="size-3 text-white" />
        </div>
        <span className="truncate">List</span>
      </a>
      <a
        href={simpleGameAnalyticsHref(kind)}
        onClick={onNavigate}
        className={accountMenuLinkClass}
      >
        <div className={cn(accountMenuIconClass, 'bg-linear-to-br from-sky-500 to-blue-600')}>
          <BarChart3 className="size-3 text-white" />
        </div>
        <span className="truncate">Analytics</span>
      </a>
      <a href={simpleGameListHref(kind)} onClick={onNavigate} className={accountMenuLinkClass}>
        <div className={cn(accountMenuIconClass, 'bg-linear-to-br', accent)}>
          <Icon className="size-3 text-white" />
        </div>
        <span className="truncate">{meta.name}</span>
      </a>
      <CatalogAdminMenuItems onNavigate={onNavigate} />
    </>
  );
}

export { accountMenuLinkClass, accountMenuIconClass };
