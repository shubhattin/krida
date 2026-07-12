'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, CheckCircle2 } from 'lucide-react';
import { cn } from '~/lib/utils';
import { active_focus_atom, numbered_entries_atom, solved_entry_ids_atom } from './game_state';
import type { useCrossWordGame } from './useCrossWordGame';

type CluePanelProps = {
  game: ReturnType<typeof useCrossWordGame>;
  onRequestKeyboard?: () => void;
};

export function CluePanel({ game, onRequestKeyboard }: CluePanelProps) {
  const entries = useAtomValue(numbered_entries_atom);
  const focus = useAtomValue(active_focus_atom);
  const solvedIds = useAtomValue(solved_entry_ids_atom);

  const across = entries
    .filter((e) => e.direction === 'across')
    .toSorted((a, b) => a.number - b.number);
  const down = entries
    .filter((e) => e.direction === 'down')
    .toSorted((a, b) => a.number - b.number);

  const renderGroup = (title: string, icon: React.ReactNode, list: typeof entries) => (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
        {icon}
        {title}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {list.map((entry) => {
          const active = focus?.entryId === entry.id;
          const solved = solvedIds.includes(entry.id);
          return (
            <li key={entry.id}>
              <button
                type="button"
                disabled={!game.started || game.completed}
                aria-current={active ? 'true' : undefined}
                onClick={() => {
                  game.focusCell(entry.row, entry.col, { direction: entry.direction });
                  onRequestKeyboard?.();
                }}
                className={cn(
                  'w-full rounded-lg px-2.5 py-2 text-left text-sm leading-snug transition-all duration-200',
                  'disabled:cursor-default disabled:opacity-60',
                  // Active clue — gradient bg + left border accent
                  active &&
                    'border-l-[3px] border-primary bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(262_83%_65%/0.12))] text-foreground',
                  !active &&
                    !solved &&
                    'text-foreground/70 hover:bg-muted/40 hover:text-foreground/90',
                  solved && 'text-muted-foreground/80 line-through'
                )}
              >
                <span className="flex items-start gap-1.5">
                  {/* Clue number badge */}
                  <span className="mr-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-muted/50 text-[0.7rem] font-bold">
                    {entry.number}
                  </span>
                  <span className="flex-1">
                    {entry.clue}
                    {solved && (
                      <CheckCircle2 className="ml-1.5 inline-block size-3.5 text-emerald-500" />
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col gap-5 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-[0_4px_24px_hsl(0_0%_0%/0.15)] backdrop-blur-xl"
    >
      {renderGroup('Across', <ArrowRight className="size-3.5" />, across)}
      {renderGroup('Down', <ArrowDown className="size-3.5" />, down)}
    </motion.div>
  );
}
