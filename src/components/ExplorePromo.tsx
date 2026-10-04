'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '~/lib/utils';

/** Compact hero control that sends people to the shared catalog. */
export function ExploreCatalogLink({ className }: { className?: string }) {
  return (
    <Link
      to="/explore"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 no-underline shadow-xs transition-colors duration-200',
        'hover:border-indigo-300 hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none',
        'dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-950/70',
        className
      )}
    >
      <Compass className="size-3.5" aria-hidden="true" />
      Explore all games
    </Link>
  );
}

/** Banner on a single-game page pointing at /explore instead of another game. */
export function ExplorePromo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Link
        to="/explore"
        className="group flex items-center gap-3.5 rounded-xl border border-indigo-200/60 bg-white/60 px-4 py-3 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-md sm:gap-4 sm:px-5 sm:py-3.5 dark:border-indigo-500/25 dark:bg-slate-900/40 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-950/25"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Explore</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Browse every listed puzzle across all games.
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-500" />
      </Link>
    </motion.div>
  );
}
