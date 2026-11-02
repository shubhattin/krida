import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { AtSignIcon, FolderIcon, LayersIcon, PuzzleIcon } from 'lucide-react';
import { GAME_GUIDES } from '~/agents/prompts/games';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Popover, PopoverContent } from '~/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';
import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';
import {
  type MentionableCollection,
  type MentionablePuzzle,
  type MentionGameFilter,
  type MentionTab
} from './mention_search';

const GAME_FILTER_ITEMS = [
  { value: 'all', label: 'All games' },
  ...GAME_KINDS.map((kind) => ({ value: kind, label: GAME_GUIDES[kind].name }))
] satisfies { value: MentionGameFilter; label: string }[];

export const mentionOptionId = (listId: string, index: number) => `${listId}-option-${index}`;

type MenuProps = {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onDismiss: () => void;
  listId: string;
  query: string;
  tab: MentionTab;
  onTabChange: (tab: MentionTab) => void;
  game: MentionGameFilter;
  onGameChange: (game: MentionGameFilter) => void;
  preferGame: GameKind | null;
  puzzleResults: MentionablePuzzle[];
  puzzleTotal: number;
  collectionResults: MentionableCollection[];
  collectionTotal: number;
  loading: boolean;
  error: boolean;
  /** No more mentions of this tab's kind fit in this message. */
  atLimit: boolean;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPickPuzzle: (puzzle: MentionablePuzzle) => void;
  onPickCollection: (collection: MentionableCollection) => void;
};

/**
 * The `@` picker above the composer: Puzzles and Collections tabs. Focus stays in the
 * textarea: the composer drives the active row with the keyboard, the mouse picks directly.
 */
export function PuzzleMentionMenu({
  anchor,
  open,
  onDismiss,
  listId,
  query,
  tab,
  onTabChange,
  game,
  onGameChange,
  preferGame,
  puzzleResults,
  puzzleTotal,
  collectionResults,
  collectionTotal,
  loading,
  error,
  atLimit,
  activeIndex,
  onActiveIndexChange,
  onPickPuzzle,
  onPickCollection
}: MenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector(`#${CSS.escape(mentionOptionId(listId, activeIndex))}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId, tab]);

  const trimmed = query.trim();
  // `@collection/…` is the collections token prefix: don't echo it as a search phrase.
  const phrase = tab === 'collections' ? trimmed.replace(/^collection[/\s]+/i, '').trim() : trimmed;

  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        if (next) return;
        // Clicks in the composer move the caret; the composer decides whether to stay open.
        const target = details.event?.target;
        if (target instanceof Node && anchor.current?.contains(target)) return;
        onDismiss();
      }}
    >
      <PopoverContent
        anchor={anchor}
        side="top"
        align="start"
        sideOffset={8}
        initialFocus={false}
        finalFocus={false}
        className="w-[min(var(--anchor-width),30rem)] gap-0 overflow-hidden rounded-xl p-0 shadow-lg"
      >
        <div className="flex items-center gap-1 border-b border-border/70 py-1.5 pr-1.5 pl-3">
          <AtSignIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <div
            role="tablist"
            aria-label="Mention type"
            className="flex min-w-0 flex-1 items-center gap-1"
          >
            <TabButton
              active={tab === 'puzzles'}
              onSelect={() => onTabChange('puzzles')}
              label={`Puzzles${loading ? '' : ` (${puzzleTotal})`}`}
            >
              <PuzzleIcon className="size-3.5" />
            </TabButton>
            <TabButton
              active={tab === 'collections'}
              onSelect={() => onTabChange('collections')}
              label={`Collections${loading ? '' : ` (${collectionTotal})`}`}
            >
              <FolderIcon className="size-3.5" />
            </TabButton>
          </div>
          {tab === 'puzzles' ? (
            <Select
              items={GAME_FILTER_ITEMS}
              value={game}
              onValueChange={(value) => {
                if (value) onGameChange(value);
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label="Filter puzzles by game"
                className="h-7 gap-1 border-transparent bg-muted/60 text-xs hover:bg-muted"
              >
                {game === 'all' ? (
                  <LayersIcon className="size-3.5" />
                ) : (
                  <img src={GAME_APP_ICON_SRC[game]} alt="" className="size-4" />
                )}
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="end">
                {GAME_FILTER_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.value === 'all' ? (
                      <LayersIcon className="size-4 text-muted-foreground" />
                    ) : (
                      <img src={GAME_APP_ICON_SRC[item.value]} alt="" className="size-4" />
                    )}
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <p className="min-w-0 truncate px-3 pt-1.5 text-xs font-medium text-muted-foreground">
          {phrase ? (
            <>
              {tab === 'puzzles' ? 'Puzzles' : 'Collections'} matching{' '}
              <span className="text-foreground">“{phrase}”</span>
            </>
          ) : tab === 'puzzles' ? (
            'Mention a puzzle'
          ) : (
            'Mention a collection'
          )}
        </p>

        <MentionResultsList
          listId={listId}
          listRef={listRef}
          tab={tab}
          loading={loading}
          error={error}
          phrase={phrase}
          game={game}
          preferGame={preferGame}
          puzzleResults={puzzleResults}
          collectionResults={collectionResults}
          activeIndex={activeIndex}
          atLimit={atLimit}
          onActiveIndexChange={onActiveIndexChange}
          onPickPuzzle={onPickPuzzle}
          onPickCollection={onPickCollection}
        />

        <div className="flex items-center gap-3 border-t border-border/70 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
          {atLimit ? (
            <span className="text-destructive">Mention limit reached for this message.</span>
          ) : (
            <span className="hidden items-center gap-3 sm:flex">
              <span>
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span>
                <Kbd>↵</Kbd> mention
              </span>
              <span>
                <Kbd>esc</Kbd> close
              </span>
            </span>
          )}
          <MentionResultsCount
            loading={loading}
            tab={tab}
            puzzleShown={puzzleResults.length}
            puzzleTotal={puzzleTotal}
            collectionShown={collectionResults.length}
            collectionTotal={collectionTotal}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MentionResultsList({
  listId,
  listRef,
  tab,
  loading,
  error,
  phrase,
  game,
  preferGame,
  puzzleResults,
  collectionResults,
  activeIndex,
  atLimit,
  onActiveIndexChange,
  onPickPuzzle,
  onPickCollection
}: {
  listId: string;
  listRef: RefObject<HTMLDivElement | null>;
  tab: MentionTab;
  loading: boolean;
  error: boolean;
  phrase: string;
  game: MentionGameFilter;
  preferGame: GameKind | null;
  puzzleResults: MentionablePuzzle[];
  collectionResults: MentionableCollection[];
  activeIndex: number;
  atLimit: boolean;
  onActiveIndexChange: (index: number) => void;
  onPickPuzzle: (puzzle: MentionablePuzzle) => void;
  onPickCollection: (collection: MentionableCollection) => void;
}) {
  // With every game shown, the chat's own game leads: label where the others start.
  const splitAt =
    tab === 'puzzles' && game === 'all' && preferGame && puzzleResults[0]?.kind === preferGame
      ? puzzleResults.findIndex((puzzle) => puzzle.kind !== preferGame)
      : -1;
  const shown = tab === 'puzzles' ? puzzleResults.length : collectionResults.length;

  return (
    <div
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={tab === 'puzzles' ? 'Puzzles' : 'Collections'}
      className="max-h-72 overflow-y-auto overscroll-contain p-1"
    >
      {loading ? (
        <p className="flex items-center gap-2 px-2.5 py-3 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading {tab === 'puzzles' ? 'puzzles' : 'collections'}…
        </p>
      ) : error ? (
        <p className="px-2.5 py-3 text-sm text-destructive">
          Couldn’t load {tab === 'puzzles' ? 'puzzles' : 'collections'}.
        </p>
      ) : shown === 0 ? (
        <p className="px-2.5 py-3 text-sm text-muted-foreground">
          No {tab === 'puzzles' ? 'puzzles' : 'collections'} match
          {phrase ? ` “${phrase}”` : ''}
          {tab === 'puzzles' && game !== 'all' ? ` in ${GAME_GUIDES[game].name}` : ''}.
        </p>
      ) : tab === 'puzzles' ? (
        puzzleResults.map((puzzle, index) => (
          <div key={`${puzzle.kind}:${puzzle.id}`}>
            {index === 0 && splitAt !== -1 && preferGame ? (
              <GroupLabel>{GAME_GUIDES[preferGame].name} · this chat</GroupLabel>
            ) : null}
            {index === splitAt && splitAt > 0 ? <GroupLabel>Other games</GroupLabel> : null}
            <PuzzleRow
              puzzle={puzzle}
              optionId={mentionOptionId(listId, index)}
              selected={index === activeIndex}
              disabled={atLimit}
              onHover={() => {
                if (index !== activeIndex) onActiveIndexChange(index);
              }}
              onPick={() => {
                if (!atLimit) onPickPuzzle(puzzle);
              }}
            />
          </div>
        ))
      ) : (
        collectionResults.map((collection, index) => (
          <CollectionRow
            key={`collection:${collection.id}`}
            collection={collection}
            optionId={mentionOptionId(listId, index)}
            selected={index === activeIndex}
            disabled={atLimit}
            onHover={() => {
              if (index !== activeIndex) onActiveIndexChange(index);
            }}
            onPick={() => {
              if (!atLimit) onPickCollection(collection);
            }}
          />
        ))
      )}
    </div>
  );
}

function MentionResultsCount({
  loading,
  tab,
  puzzleShown,
  puzzleTotal,
  collectionShown,
  collectionTotal
}: {
  loading: boolean;
  tab: MentionTab;
  puzzleShown: number;
  puzzleTotal: number;
  collectionShown: number;
  collectionTotal: number;
}) {
  if (loading) return null;
  const shown = tab === 'puzzles' ? puzzleShown : collectionShown;
  const total = tab === 'puzzles' ? puzzleTotal : collectionTotal;
  if (total <= shown) return null;
  return (
    <span className="ml-auto tabular-nums">
      {shown} of {total} — type to narrow
    </span>
  );
}

function TabButton({
  active,
  onSelect,
  label,
  children
}: {
  active: boolean;
  onSelect: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
      {label}
    </button>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

type RowProps = {
  optionId: string;
  selected: boolean;
  disabled: boolean;
  onHover: () => void;
  onPick: () => void;
};

function MentionRow({
  optionId,
  selected,
  disabled,
  onHover,
  onPick,
  icon,
  title,
  subtitle,
  listed
}: RowProps & { icon: ReactNode; title: string; subtitle: string; listed: boolean }) {
  return (
    <div
      id={optionId}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      // Keep focus (and the caret) in the textarea.
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={onHover}
      onClick={onPick}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 select-none',
        selected && 'bg-accent text-accent-foreground',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate font-mono text-[11px] text-muted-foreground">
          {subtitle}
        </span>
      </span>
      {listed ? null : (
        <span className="shrink-0 rounded-md border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground uppercase">
          Draft
        </span>
      )}
    </div>
  );
}

function PuzzleRow({ puzzle, ...row }: RowProps & { puzzle: MentionablePuzzle }) {
  return (
    <MentionRow
      {...row}
      icon={
        <img
          src={GAME_APP_ICON_SRC[puzzle.kind]}
          alt={GAME_GUIDES[puzzle.kind].name}
          className="size-6 shrink-0"
        />
      }
      title={puzzle.title}
      subtitle={`@${puzzle.slug} · #${puzzle.id}`}
      listed={puzzle.listed}
    />
  );
}

function CollectionRow({ collection, ...row }: RowProps & { collection: MentionableCollection }) {
  const count = collection.puzzle_count === 1 ? '1 puzzle' : `${collection.puzzle_count} puzzles`;
  return (
    <MentionRow
      {...row}
      icon={
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FolderIcon className="size-4" />
        </span>
      }
      title={collection.title}
      subtitle={`@collection/${collection.slug} · #${collection.id} · ${count}`}
      listed={collection.listed}
    />
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="mr-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 font-sans text-[10px]">
      {children}
    </kbd>
  );
}
