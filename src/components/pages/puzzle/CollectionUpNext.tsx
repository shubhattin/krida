'use client';

import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, ArrowRightIcon, Layers, TrophyIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCDNUrl } from '~/constants';
import { GameKindIcon } from '~/components/pages/catalog/GameKindIcon';
import { cn } from '~/lib/utils';
import { collectionPuzzleHref } from '~/util/catalog/collection_nav';
import { usePuzzleCollection } from './puzzle_collection_context';
import { useTransliteratedText } from '~/components/pages/simple_game/useTransliteratedText';

/**
 * Primary CTA when the player arrived from a collection (`?from=`).
 * Rendered ABOVE "More puzzles" in the completion area:
 * collection progress stays the focus, More puzzles remains as discovery below.
 */
export function CollectionUpNext() {
  const { nav, explicit } = usePuzzleCollection();
  const navTitle = useTransliteratedText(nav?.title ?? '');
  const nextTitle = useTransliteratedText(nav?.next?.title ?? '');

  if (!nav || !explicit) return null;

  const position = Math.min(Math.max(nav.position, 0), Math.max(nav.total, 1));
  const progress = nav.total > 0 ? position / nav.total : 0;

  if (!nav.next) {
    const single = nav.total <= 1;
    return (
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        aria-label="Collection complete"
        className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-emerald-50/70 to-teal-50/50 p-4 dark:border-emerald-500/25 dark:from-emerald-950/50 dark:via-emerald-950/30 dark:to-teal-950/20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/4 h-32 w-1/2 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-400/10"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-md shadow-emerald-500/25">
            <TrophyIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase dark:text-emerald-300">
              Collection complete
            </p>
            <p className="truncate text-sm font-bold text-emerald-950 dark:text-emerald-50">
              You finished “{navTitle || nav.title}”!
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
              {single
                ? 'A one-puzzle collection, done in one go — replay it anytime.'
                : `${nav.total} of ${nav.total} puzzles done — replay any of them.`}
            </p>
          </div>
          <Link
            to="/collections/$slug"
            params={{ slug: nav.slug }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white no-underline shadow-sm transition-colors hover:bg-emerald-500"
          >
            <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
            Back to collection
          </Link>
        </div>
        <div
          aria-hidden="true"
          className="relative mt-3 h-1 overflow-hidden rounded-full bg-emerald-600/20 dark:bg-emerald-400/20"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          />
        </div>
      </motion.section>
    );
  }

  const next = nav.next;
  const nextImage = next.image ? getCDNUrl(next.image.s3_key) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      aria-label="Next in collection"
      className="flex flex-col gap-3 rounded-2xl border border-indigo-200/70 bg-indigo-50/60 p-4 dark:border-indigo-500/25 dark:bg-indigo-950/30"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold tracking-wide text-indigo-700 uppercase dark:text-indigo-200">
          <Layers className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Next in “{navTitle || nav.title}”</span>
          <span className="shrink-0 tabular-nums opacity-70">
            {position}/{nav.total}
          </span>
        </p>
        <Link
          to="/collections/$slug"
          params={{ slug: nav.slug }}
          className="shrink-0 text-xs font-semibold text-indigo-700 no-underline hover:underline dark:text-indigo-200"
        >
          View all
        </Link>
      </div>

      <div
        aria-hidden="true"
        className="h-1 overflow-hidden rounded-full bg-indigo-200/60 dark:bg-indigo-500/20"
      >
        <div
          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-indigo-200/60 bg-white/60 dark:border-indigo-500/20 dark:bg-slate-900/40">
          {nextImage ? (
            <img src={nextImage} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <GameKindIcon game={next.game} className="size-6 opacity-70" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-bold text-slate-900 dark:text-slate-50')}>
            {nextTitle || next.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Puzzle {position + 1} of {nav.total}
          </p>
        </div>
        <a
          href={collectionPuzzleHref(next.game, next.slug, nav.slug)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white no-underline transition-colors hover:bg-indigo-500"
        >
          Next
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </motion.section>
  );
}
