import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, Layers } from 'lucide-react';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import {
  collectionPuzzleHref,
  type CollectionNav,
  type CollectionNavItem
} from '~/util/catalog/collection_nav';
import { usePuzzleCollection } from './puzzle_collection_context';

const BACK_LINK_CLASS =
  '-ml-2.5 inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-slate-500 no-underline transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100';

/**
 * Quiet back link on public puzzle pages: back to the collection the player came
 * from (with a prev / next stepper), else "All puzzles" filtered to this game.
 */
export function PuzzleBackLink({ game }: { game: GameKind }) {
  const { nav, explicit, memberships } = usePuzzleCollection();

  if (nav && explicit) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <Link
          to="/collections/$slug"
          params={{ slug: nav.slug }}
          className={BACK_LINK_CLASS}
          title={`Back to ${nav.title}`}
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          <span className="truncate">{nav.title}</span>
        </Link>
        <CollectionStepper nav={nav} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Link to="/puzzles" search={{ game }} className={cn(BACK_LINK_CLASS, 'shrink-0')}>
        <ArrowLeftIcon className="size-4" />
        All puzzles
      </Link>
      {memberships.length > 0 ? (
        <CollectionChip
          slug={memberships[0]!.slug}
          title={memberships[0]!.title}
          more={memberships.length - 1}
        />
      ) : null}
    </div>
  );
}

/** "‹ 3 / 8 ›" — full page loads, like the other puzzle-to-puzzle links, so game state resets. */
function CollectionStepper({ nav }: { nav: CollectionNav }) {
  return (
    <div className="flex shrink-0 items-center rounded-full border border-slate-200/80 bg-white/60 text-xs font-semibold text-slate-500 tabular-nums dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-400">
      <StepLink item={nav.prev} collectionSlug={nav.slug} direction={-1} />
      <span className="px-0.5" aria-label={`Puzzle ${nav.position} of ${nav.total}`}>
        {nav.position}/{nav.total}
      </span>
      <StepLink item={nav.next} collectionSlug={nav.slug} direction={1} />
    </div>
  );
}

function StepLink({
  item,
  collectionSlug,
  direction
}: {
  item: CollectionNavItem | null;
  collectionSlug: string;
  direction: 1 | -1;
}) {
  const Icon = direction === 1 ? ChevronRightIcon : ChevronLeftIcon;
  const label = direction === 1 ? 'Next puzzle in collection' : 'Previous puzzle in collection';
  const className = 'flex size-7 items-center justify-center rounded-full';
  if (!item) {
    return (
      <span className={cn(className, 'opacity-35')} aria-hidden="true">
        <Icon className="size-3.5" />
      </span>
    );
  }
  return (
    <a
      href={collectionPuzzleHref(item.game, item.slug, collectionSlug)}
      aria-label={label}
      title={label}
      className={cn(
        className,
        'text-slate-600 no-underline transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-50'
      )}
    >
      <Icon className="size-3.5" />
    </a>
  );
}

/** "Part of <collection>" for players who landed on the puzzle some other way. */
function CollectionChip({ slug, title, more }: { slug: string; title: string; more: number }) {
  return (
    <Link
      to="/collections/$slug"
      params={{ slug }}
      title={more > 0 ? `Part of ${title} and ${more} more` : `Part of ${title}`}
      className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-indigo-200/70 bg-indigo-50/70 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 no-underline transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-950/70"
    >
      <Layers className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden shrink-0 sm:inline">Part of</span>
      <span className="truncate">{title}</span>
      {more > 0 ? <span className="shrink-0 opacity-70">+{more}</span> : null}
    </Link>
  );
}
