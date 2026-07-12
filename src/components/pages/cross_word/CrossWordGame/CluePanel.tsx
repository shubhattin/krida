'use client';

import { useAtomValue } from 'jotai';
import { cn } from '~/lib/utils';
import { active_focus_atom, numbered_entries_atom, solved_entry_ids_atom } from './game_state';
import type { useCrossWordGame } from './useCrossWordGame';

type CluePanelProps = {
  game: ReturnType<typeof useCrossWordGame>;
};

export function CluePanel({ game }: CluePanelProps) {
  const entries = useAtomValue(numbered_entries_atom);
  const focus = useAtomValue(active_focus_atom);
  const solvedIds = useAtomValue(solved_entry_ids_atom);

  const across = entries
    .filter((e) => e.direction === 'across')
    .toSorted((a, b) => a.number - b.number);
  const down = entries
    .filter((e) => e.direction === 'down')
    .toSorted((a, b) => a.number - b.number);

  const renderGroup = (title: string, list: typeof entries) => (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
      <ul className="flex flex-col gap-0.5">
        {list.map((entry) => {
          const active = focus?.entryId === entry.id;
          const solved = solvedIds.includes(entry.id);
          return (
            <li key={entry.id}>
              <button
                type="button"
                disabled={!game.started || game.completed}
                onClick={() => game.focusCell(entry.row, entry.col, { direction: entry.direction })}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left text-sm leading-snug transition-colors',
                  'disabled:cursor-default disabled:opacity-60',
                  active && 'bg-primary/15 text-foreground',
                  !active && 'text-foreground/80 hover:bg-muted/60',
                  solved && 'text-muted-foreground line-through'
                )}
              >
                <span className="mr-1.5 font-semibold tabular-nums">{entry.number}.</span>
                {entry.clue}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {renderGroup('Across', across)}
      {renderGroup('Down', down)}
    </div>
  );
}
