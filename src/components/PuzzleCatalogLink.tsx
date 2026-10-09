'use client';

import { Link } from '@tanstack/react-router';
import { Puzzle } from 'lucide-react';
import { cn } from '~/lib/utils';

/** Compact control that sends people to the shared puzzle catalog. */
export function AllPuzzlesLink({ className }: { className?: string }) {
  return (
    <Link
      to="/puzzles"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 no-underline shadow-xs transition-colors duration-200',
        'hover:border-indigo-300 hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none',
        'dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-950/70',
        className
      )}
    >
      <Puzzle className="size-3.5" aria-hidden="true" />
      All puzzles
    </Link>
  );
}
