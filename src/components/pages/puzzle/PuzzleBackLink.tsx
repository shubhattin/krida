import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, Layers } from 'lucide-react';
import { Image } from '@unpic/react';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import {
  collectionPuzzleHref,
  type CollectionMembership,
  type CollectionNav,
  type CollectionNavItem
} from '~/util/catalog/collection_nav';
import { getCDNUrl } from '~/constants';
import { usePuzzleCollection } from './puzzle_collection_context';
import { DIFFICULTY_TONE, DifficultyPill } from '~/components/hub/DifficultyPill';
import { difficultyForCollectionSlug } from '~/util/catalog/difficulty';

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

  // Difficulty collections read better as a level pill than as "Featured in Easy", and
  // rank after the topical ones in the full list.
  const difficulty = memberships
    .map((membership) => ({ membership, level: difficultyForCollectionSlug(membership.slug) }))
    .find((row) => row.level);
  const topical = memberships.filter((membership) => !difficultyForCollectionSlug(membership.slug));
  const ranked = [
    ...topical,
    ...memberships.filter((membership) => difficultyForCollectionSlug(membership.slug))
  ];
  // Padajala's header row has room on phones; the others share it with the script picker.
  const hideChipOnPhones = game !== 'padajala';

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Link to="/puzzles" search={{ game }} className={cn(BACK_LINK_CLASS, 'shrink-0')}>
        <ArrowLeftIcon className="size-4" />
        All puzzles
      </Link>
      {difficulty?.level ? (
        <Link
          to="/collections/$slug"
          params={{ slug: difficulty.membership.slug }}
          title={`More ${difficulty.level.label.toLowerCase()} puzzles`}
          className="shrink-0 no-underline transition-opacity hover:opacity-80"
        >
          <DifficultyPill level={difficulty.level} className="py-1 text-xs shadow-none" />
        </Link>
      ) : null}
      {topical.length > 0 ? (
        <CollectionChip
          primary={topical[0]!}
          all={ranked}
          className={hideChipOnPhones ? 'max-sm:hidden' : undefined}
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

type Membership = CollectionMembership;

const CHIP_CLASS =
  'border-indigo-200/70 bg-indigo-50/70 text-xs font-semibold text-indigo-700 no-underline transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-950/70';

/**
 * "Featured in <collection>" for players who landed on the puzzle some other way. With more
 * collections, "+N" opens the full list (topical first, difficulty collections last).
 */
function CollectionChip({
  primary,
  all,
  className
}: {
  primary: Membership;
  all: Membership[];
  className?: string;
}) {
  const more = all.length - 1;
  return (
    <div className={cn('flex min-w-0 items-center', className)}>
      <Link
        to="/collections/$slug"
        params={{ slug: primary.slug }}
        title={`Featured in ${primary.title}`}
        className={cn(
          'inline-flex min-w-0 items-center gap-1.5 border px-2.5 py-0.5',
          more > 0 ? 'rounded-l-full border-r-0' : 'rounded-full',
          CHIP_CLASS
        )}
      >
        <Layers className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden shrink-0 opacity-75 sm:inline">Featured in</span>
        <span className="truncate">{primary.title}</span>
      </Link>
      {more > 0 ? (
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={`Show all ${all.length} collections`}
                title={`Featured in ${all.length} collections`}
                className={cn(
                  'shrink-0 rounded-r-full border px-2 py-0.5 tabular-nums',
                  CHIP_CLASS,
                  'border-l-indigo-200 dark:border-l-indigo-500/30'
                )}
              />
            }
          >
            +{more}
          </PopoverTrigger>
          <PopoverContent className="w-72 gap-0 overflow-hidden p-0" align="start" sideOffset={6}>
            <MembershipsList all={all} />
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

/** Popover body: topical collections with covers, then difficulty levels in their own section. */
function MembershipsList({ all }: { all: Membership[] }) {
  const topical = all.filter((membership) => !difficultyForCollectionSlug(membership.slug));
  const levels = all.filter((membership) => difficultyForCollectionSlug(membership.slug));
  return (
    <div className="flex max-h-80 flex-col overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Layers className="size-4 text-indigo-500 dark:text-indigo-300" aria-hidden />
        <span className="text-sm font-semibold">Featured in</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {all.length}
        </span>
      </div>
      {topical.length > 0 ? (
        <div className="flex flex-col gap-0.5 p-1.5">
          {topical.map((membership) => (
            <MembershipRow key={membership.slug} membership={membership} />
          ))}
        </div>
      ) : null}
      {levels.length > 0 ? (
        <div className="flex flex-col gap-0.5 border-t border-border/60 p-1.5">
          <p className="px-2 pt-1 pb-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Difficulty
          </p>
          {levels.map((membership) => (
            <MembershipRow key={membership.slug} membership={membership} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MembershipRow({ membership }: { membership: Membership }) {
  const level = difficultyForCollectionSlug(membership.slug);
  const imageUrl = membership.image ? getCDNUrl(membership.image.s3_key) : null;
  return (
    <Link
      to="/collections/$slug"
      params={{ slug: membership.slug }}
      className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-foreground no-underline transition-colors hover:bg-muted"
    >
      {imageUrl ? (
        <span className="relative size-9 shrink-0">
          <Image
            src={imageUrl}
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-md object-cover"
          />
          {level ? (
            // The level colour stays visible on the cover.
            <span
              className={cn(
                'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-popover',
                DIFFICULTY_TONE[level.key].dot
              )}
              aria-hidden
            />
          ) : null}
        </span>
      ) : level ? (
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md border',
            DIFFICULTY_TONE[level.key].pill
          )}
          aria-hidden
        >
          <span className={cn('size-2.5 rounded-full', DIFFICULTY_TONE[level.key].dot)} />
        </span>
      ) : (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
          aria-hidden
        >
          <Layers className="size-4" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {level ? level.label : membership.title}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {membership.total} puzzle{membership.total === 1 ? '' : 's'}
        </span>
      </span>
      <ChevronRightIcon
        className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  );
}
