'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const GAME_INFO = {
  padavali: {
    name: 'Padāvalī',
    subtitle: 'Word Search',
    description: 'Find hidden Sanskrit words by dragging across a grid of letters.',
    href: '/padavali',
    puzzlesHref: '/padavali/puzzles',
    gradient: 'from-blue-500 to-indigo-600',
    borderColor:
      'border-blue-200/50 hover:border-blue-400/60 dark:border-blue-800/40 dark:hover:border-blue-500/50',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgHover: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
    iconShadow: 'shadow-blue-500/25'
  },
  padajala: {
    name: 'Padajāla',
    subtitle: 'Crossword',
    description: 'Solve Sanskrit crossword puzzles and expand your vocabulary.',
    href: '/padajala',
    puzzlesHref: '/padajala/puzzles',
    gradient: 'from-amber-500 to-orange-600',
    borderColor:
      'border-amber-200/50 hover:border-amber-400/60 dark:border-amber-800/40 dark:hover:border-amber-500/50',
    textColor: 'text-amber-600 dark:text-amber-400',
    bgHover: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
    iconShadow: 'shadow-amber-500/25'
  }
} as const;

type GameCrossPromoProps = {
  /** Which game to PROMOTE (not the current page) */
  promote: 'padavali' | 'padajala';
  /** Link to /puzzles route instead of the game's homepage */
  toPuzzles?: boolean;
};

/**
 * A cross-promotion banner that links from one game to the other.
 * Place on game home pages, puzzle list pages, etc.
 */
export function GameCrossPromo({ promote, toPuzzles }: GameCrossPromoProps) {
  const info = GAME_INFO[promote];
  const href = toPuzzles ? info.puzzlesHref : info.href;
  const description = toPuzzles
    ? `Explore all listed Sanskrit ${promote === 'padavali' ? 'word search' : 'crossword'} puzzles.`
    : info.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Link
        href={href}
        className={`group flex items-center gap-3.5 rounded-xl border bg-white/60 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:px-5 sm:py-3.5 dark:bg-slate-900/40 ${info.borderColor} ${info.bgHover}`}
      >
        {/* App icon */}
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${info.gradient} shadow-lg ${info.iconShadow}`}
        >
          <img
            src="/img/icon_128_no_pad.png"
            alt={`${info.name} icon`}
            className="size-6 drop-shadow-sm"
          />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${info.textColor}`}>{info.name}</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {info.subtitle}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>

        {/* Arrow */}
        <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-slate-500" />
      </Link>
    </motion.div>
  );
}
