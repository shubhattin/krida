import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { AtSignIcon, LayersIcon } from 'lucide-react';
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
import type { MentionablePuzzle, MentionGameFilter } from './mention_search';

const GAME_FILTER_ITEMS = [
  { value: 'all', label: 'All games' },
  ...GAME_KINDS.map((kind) => ({ value: kind, label: GAME_GUIDES[kind].name }))
] satisfies { value: MentionGameFilter; label: string }[];

export const mentionOptionId = (listId: string, index: number) => `${listId}-option-${index}`;

/**
 * The `@` picker above the composer. Focus stays in the textarea: the composer drives the
 * active row with the keyboard, the mouse picks directly.
 */
export function PuzzleMentionMenu({
  anchor,
  open,
  onDismiss,
  listId,
  query,
  game,
  onGameChange,
  preferGame,
  results,
  total,
  loading,
  error,
  atLimit,
  activeIndex,
  onActiveIndexChange,
  onPick
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onDismiss: () => void;
  listId: string;
  query: string;
  game: MentionGameFilter;
  onGameChange: (game: MentionGameFilter) => void;
  preferGame: GameKind | null;
  results: MentionablePuzzle[];
  total: number;
  loading: boolean;
  error: boolean;
  /** No more mentions fit in this message. */
  atLimit: boolean;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPick: (puzzle: MentionablePuzzle) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector(`#${CSS.escape(mentionOptionId(listId, activeIndex))}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId]);

  // With every game shown, the chat's own game leads: label where the others start.
  const splitAt =
    game === 'all' && preferGame && results[0]?.kind === preferGame
      ? results.findIndex((puzzle) => puzzle.kind !== preferGame)
      : -1;

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
        <div className="flex items-center gap-2 border-b border-border/70 py-1.5 pr-1.5 pl-3">
          <AtSignIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
            {query.trim() ? (
              <>
                Puzzles matching <span className="text-foreground">“{query.trim()}”</span>
              </>
            ) : (
              'Mention a puzzle'
            )}
          </p>
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
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Puzzles"
          className="max-h-72 overflow-y-auto overscroll-contain p-1"
        >
          {loading ? (
            <p className="flex items-center gap-2 px-2.5 py-3 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading puzzles…
            </p>
          ) : error ? (
            <p className="px-2.5 py-3 text-sm text-destructive">Couldn’t load puzzles.</p>
          ) : results.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-muted-foreground">
              No puzzles match{query.trim() ? ` “${query.trim()}”` : ''}
              {game === 'all' ? '' : ` in ${GAME_GUIDES[game].name}`}.
            </p>
          ) : (
            results.map((puzzle, index) => (
              <div key={`${puzzle.kind}:${puzzle.id}`}>
                {index === 0 && splitAt !== -1 && preferGame ? (
                  <GroupLabel>{GAME_GUIDES[preferGame].name} · this chat</GroupLabel>
                ) : null}
                {index === splitAt && splitAt > 0 ? <GroupLabel>Other games</GroupLabel> : null}
                <div
                  id={mentionOptionId(listId, index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  aria-disabled={atLimit || undefined}
                  // Keep focus (and the caret) in the textarea.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => {
                    if (index !== activeIndex) onActiveIndexChange(index);
                  }}
                  onClick={() => {
                    if (!atLimit) onPick(puzzle);
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 select-none',
                    index === activeIndex && 'bg-accent text-accent-foreground',
                    atLimit && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <img
                    src={GAME_APP_ICON_SRC[puzzle.kind]}
                    alt={GAME_GUIDES[puzzle.kind].name}
                    className="size-6 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{puzzle.title}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      @{puzzle.slug} · #{puzzle.id}
                    </span>
                  </span>
                  {puzzle.listed ? null : (
                    <span className="shrink-0 rounded-md border border-border px-1.5 py-px text-[10px] font-medium text-muted-foreground uppercase">
                      Draft
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

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
          {!loading && total > results.length ? (
            <span className="ml-auto tabular-nums">
              {results.length} of {total} — type to narrow
            </span>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="mr-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 font-sans text-[10px]">
      {children}
    </kbd>
  );
}
