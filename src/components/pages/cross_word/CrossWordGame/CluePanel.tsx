'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, CheckCircle2 } from 'lucide-react';
import { cn } from '~/lib/utils';
import styles from './crossword-game.module.css';
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

  const renderGroup = (title: string, icon: React.ReactNode, list: typeof entries) => (
    <div className="flex flex-col gap-2">
      <h3 className={cn('flex items-center gap-2 text-xs font-semibold uppercase', styles.sectionHeader)}>
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
                onClick={() => game.focusCell(entry.row, entry.col, { direction: entry.direction })}
                className={cn(
                  'w-full rounded-lg px-2.5 py-2 text-left text-sm leading-snug transition-all duration-200',
                  'disabled:cursor-default disabled:opacity-60',
                  active && styles.clueActive,
                  active && 'text-foreground',
                  !active && !solved && 'text-foreground/70 hover:bg-muted/40 hover:text-foreground/90',
                  solved && 'text-muted-foreground/80 line-through'
                )}
              >
                <span className="flex items-start gap-1.5">
                  <span className={styles.clueNumber}>{entry.number}</span>
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
      className={cn('flex flex-col gap-5', styles.cluePanel)}
    >
      {renderGroup('Across', <ArrowRight className="size-3.5" />, across)}
      {renderGroup('Down', <ArrowDown className="size-3.5" />, down)}
    </motion.div>
  );
}
