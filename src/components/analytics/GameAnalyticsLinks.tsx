'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, BarChart3Icon } from 'lucide-react';
import { GameAppIcon } from '~/components/GameAppIcon';
import { Card } from '~/components/ui/card';
import { HUB_GAMES } from '~/components/hub/hub_games';
import { cn } from '~/lib/utils';
import type { AdminAnalyticsGameId } from '~/api/routers/analytics';

const GAME_LINK_META = {
  padavali: {
    href: '/padavali/analytics',
    icon: 'padavali' as const,
    name: HUB_GAMES.padavali.name,
    subtitle: 'Word Search'
  },
  padajala: {
    href: '/padajala/analytics',
    icon: 'padajala' as const,
    name: HUB_GAMES.crossword.name,
    subtitle: 'Crossword'
  }
} satisfies Record<
  AdminAnalyticsGameId,
  {
    href: '/padavali/analytics' | '/padajala/analytics';
    icon: 'padavali' | 'padajala';
    name: string;
    subtitle: string;
  }
>;

const LINK_ACCENT = {
  padavali: {
    wash: 'from-blue-50/90 via-sky-50/40 to-indigo-50/80 dark:from-blue-950/50 dark:via-slate-900/30 dark:to-indigo-950/40',
    ring: 'hover:ring-blue-400/55 dark:hover:ring-blue-500/45',
    icon: 'from-blue-500 to-indigo-600 shadow-blue-500/30'
  },
  padajala: {
    wash: 'from-amber-50/90 via-orange-50/40 to-amber-50/80 dark:from-amber-950/50 dark:via-stone-900/30 dark:to-orange-950/40',
    ring: 'hover:ring-amber-400/55 dark:hover:ring-amber-500/45',
    icon: 'from-amber-500 to-orange-600 shadow-amber-500/30'
  }
} as const satisfies Record<AdminAnalyticsGameId, { wash: string; ring: string; icon: string }>;

export type GameAnalyticsLinkRow = {
  game: AdminAnalyticsGameId;
  started: number;
  completed: number;
};

/** Deep links from the central analytics page into each game's own analytics. */
export function GameAnalyticsLinks({ rows }: { rows: GameAnalyticsLinkRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((row) => {
        const meta = GAME_LINK_META[row.game];
        const accent = LINK_ACCENT[row.game];

        return (
          <Link
            key={row.game}
            to={meta.href}
            className={cn(
              'group rounded-xl no-underline ring-1 ring-black/5 transition-all duration-300',
              'hover:-translate-y-0.5 hover:shadow-lg dark:ring-white/10',
              accent.wash,
              accent.ring
            )}
          >
            <Card className="border-0 bg-transparent shadow-none ring-0">
              <div className="flex items-center gap-3 p-3 sm:p-4">
                <GameAppIcon game={meta.icon} name={meta.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold tracking-tight">{meta.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {meta.subtitle} ·{' '}
                    <span className="tabular-nums">{row.started.toLocaleString()}</span> started ·{' '}
                    <span className="tabular-nums">{row.completed.toLocaleString()}</span> done
                  </p>
                </div>
                <span
                  className={cn(
                    'hidden size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-105 sm:flex',
                    accent.icon
                  )}
                >
                  <BarChart3Icon className="size-3.5" />
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
