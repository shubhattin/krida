import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import type { PublicGameKind } from '~/util/games/kinds';

/** Quiet "All puzzles" link above a puzzle, aligned with the game container. */
export function PuzzleBackLink({ game }: { game: PublicGameKind }) {
  return (
    <div className="mx-auto max-w-7xl px-2 pt-3 sm:px-4 sm:pt-4 md:px-6">
      <Link
        to="/puzzles"
        search={{ game }}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-slate-500 no-underline transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
      >
        <ArrowLeftIcon className="size-4" />
        All puzzles
      </Link>
    </div>
  );
}
