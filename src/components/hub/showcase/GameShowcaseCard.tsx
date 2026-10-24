'use client';

import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { GameAppIcon } from '~/components/GameAppIcon';
import { HUB_GAMES, HUB_GAME_ACCENT } from '~/components/hub/hub_games';
import { GAME_SCRIPT_NAMES, useScriptName } from '~/components/hub/useScriptName';
import type { GameKind } from '~/util/catalog/tags';
import { isSimpleGameKind } from '~/util/games/kinds';
import { cn } from '~/lib/utils';
import { PadajalaMiniPreview, PadavaliMiniPreview } from './ClassicMiniPreviews';
import { DemoVisibilityGate } from './PreviewFrame';
import { SimpleGameMiniPreview } from './SimpleMiniPreviews';

/** Title gradient + card border per game (the rest of the palette lives in HUB_GAME_ACCENT). */
const SHOWCASE_STYLE = {
  padavali: {
    title:
      'from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-400 dark:via-blue-300 dark:to-indigo-400',
    border:
      'border-blue-200/40 hover:border-blue-400/60 dark:border-blue-800/40 dark:hover:border-blue-600/60'
  },
  padajala: {
    title:
      'from-amber-600 via-orange-500 to-orange-600 dark:from-amber-400 dark:via-orange-300 dark:to-orange-400',
    border:
      'border-amber-200/40 hover:border-amber-400/60 dark:border-amber-800/40 dark:hover:border-amber-600/60'
  },
  dvayi: {
    title:
      'from-rose-600 via-rose-500 to-orange-600 dark:from-rose-400 dark:via-rose-300 dark:to-orange-400',
    border:
      'border-rose-200/40 hover:border-rose-400/60 dark:border-rose-800/40 dark:hover:border-rose-600/60'
  },
  bhramita: {
    title:
      'from-emerald-600 via-emerald-500 to-teal-600 dark:from-emerald-400 dark:via-emerald-300 dark:to-teal-400',
    border:
      'border-emerald-200/40 hover:border-emerald-400/60 dark:border-emerald-800/40 dark:hover:border-emerald-600/60'
  },
  surupa: {
    title:
      'from-violet-600 via-violet-500 to-fuchsia-600 dark:from-violet-400 dark:via-violet-300 dark:to-fuchsia-400',
    border:
      'border-violet-200/40 hover:border-violet-400/60 dark:border-violet-800/40 dark:hover:border-violet-600/60'
  },
  anveshi: {
    title:
      'from-sky-600 via-sky-500 to-indigo-600 dark:from-sky-400 dark:via-sky-300 dark:to-indigo-400',
    border:
      'border-sky-200/40 hover:border-sky-400/60 dark:border-sky-800/40 dark:hover:border-sky-600/60'
  }
} as const satisfies Record<GameKind, { title: string; border: string }>;

function GameMiniPreview({ game, compact }: { game: GameKind; compact: boolean }) {
  if (game === 'padavali') return <PadavaliMiniPreview compact={compact} />;
  if (game === 'padajala') return <PadajalaMiniPreview compact={compact} />;
  if (isSimpleGameKind(game)) return <SimpleGameMiniPreview kind={game} compact={compact} />;
  return null;
}

/** Game card with a looping demo; the whole card links to that game's puzzles. */
export function GameShowcaseCard({
  game,
  index,
  compact = false
}: {
  game: GameKind;
  index: number;
  compact?: boolean;
}) {
  const meta = HUB_GAMES[game];
  const style = SHOWCASE_STYLE[game];
  const name = useScriptName(GAME_SCRIPT_NAMES[game]);
  return (
    <motion.div
      initial={{ opacity: 0, y: compact ? 16 : 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: compact ? 0.4 : 0.6,
        delay: compact ? 0.06 + Math.min(index, 3) * 0.08 : 0.15 + Math.min(index, 3) * 0.15,
        ease: 'easeOut'
      }}
      className="group relative h-full"
    >
      <div
        className={cn(
          'absolute -inset-1 rounded-3xl bg-linear-to-br opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-15',
          HUB_GAME_ACCENT[game].gradient
        )}
      />

      <div className="relative h-full">
        <Link
          to="/puzzles"
          search={{ game }}
          aria-label={`Browse ${meta.name} puzzles`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none"
        />
        <div
          className={cn(
            'pointer-events-none relative z-20 flex h-full flex-col overflow-hidden rounded-2xl border bg-white/60 shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl dark:bg-slate-900/50',
            style.border
          )}
        >
          <div
            className={cn(
              'flex items-start',
              compact ? 'gap-2 p-2.5 pb-2 sm:gap-2.5 sm:p-3 sm:pb-2' : 'gap-3.5 p-5 pb-3'
            )}
          >
            <GameAppIcon game={game} name={meta.name} size={compact ? 'sm' : 'lg'} />
            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  // Vertical padding keeps gradient-clipped matras from being cut.
                  'bg-linear-to-r bg-clip-text py-0.5 leading-tight font-black tracking-tight text-transparent',
                  style.title,
                  compact ? 'text-base' : 'text-xl',
                  name.fontClassName
                )}
                title={meta.name}
              >
                {name.text}
              </h3>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {meta.subtitle}
              </span>
            </div>
          </div>

          {compact ? null : (
            <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {meta.description}
            </p>
          )}

          <div
            className={cn(
              'border-t border-slate-200/50 dark:border-slate-700/50',
              compact ? 'mx-3' : 'mx-5'
            )}
          />

          <DemoVisibilityGate
            className={cn('mt-auto', compact ? 'p-2.5 pt-2 sm:p-3 sm:pt-2.5' : 'p-4 pt-3')}
          >
            <GameMiniPreview game={game} compact={compact} />
          </DemoVisibilityGate>
        </div>
      </div>
    </motion.div>
  );
}
