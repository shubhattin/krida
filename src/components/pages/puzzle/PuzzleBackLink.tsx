import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import type { PublicGameKind } from '~/util/games/kinds';

/** Quiet "All puzzles" link back to the catalog, filtered to this game. */
export function PuzzleBackLink({ game }: { game: PublicGameKind }) {
  return (
    <Link
      to="/puzzles"
      search={{ game }}
      className="-ml-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-slate-500 no-underline transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
    >
      <ArrowLeftIcon className="size-4" />
      All puzzles
    </Link>
  );
}
