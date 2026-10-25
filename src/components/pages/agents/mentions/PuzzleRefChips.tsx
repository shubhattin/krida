import { XIcon } from 'lucide-react';
import { GAME_GUIDES } from '~/agents/prompts/games';
import { puzzleRefKey } from '~/agents/puzzle_refs';
import type { PuzzleRefData } from '~/agents/ui_message';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { cn } from '~/lib/utils';
import { puzzleEditorHref } from '../chat/agent_chat_context';

const CHIP =
  'inline-flex h-7 max-w-60 items-center gap-1.5 rounded-lg border border-border/80 bg-muted/50 pl-1.5 text-xs font-medium text-foreground';

/**
 * Mentioned puzzles as compact chips: removable in the composer, links to the editor in a
 * sent message.
 */
export function PuzzleRefChips({
  refs,
  onRemove,
  className
}: {
  refs: PuzzleRefData[];
  onRemove?: (ref: PuzzleRefData) => void;
  className?: string;
}) {
  if (refs.length === 0) return null;
  return (
    <ul aria-label="Mentioned puzzles" className={cn('flex flex-wrap gap-1.5', className)}>
      {refs.map((ref) => {
        const label = `${GAME_GUIDES[ref.kind].name} · ${ref.title} (@${ref.slug})`;
        const body = (
          <>
            <img src={GAME_APP_ICON_SRC[ref.kind]} alt="" className="size-4 shrink-0" />
            <span className="truncate">{ref.title}</span>
          </>
        );
        return (
          <li key={puzzleRefKey(ref)} className="min-w-0">
            {onRemove ? (
              <span className={cn(CHIP, 'pr-0.5')} title={label}>
                {body}
                <button
                  type="button"
                  aria-label={`Remove ${ref.title}`}
                  onClick={() => onRemove(ref)}
                  className="ml-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            ) : (
              <a
                href={puzzleEditorHref(ref.kind, ref.id)}
                target="_blank"
                rel="noreferrer"
                title={`${label} — open in the editor`}
                className={cn(CHIP, 'pr-2 transition-colors hover:border-foreground/25')}
              >
                {body}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
