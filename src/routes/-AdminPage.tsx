'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BarChart3, Calendar, ChartNoAxesCombined, Images, Layers, List, Tag } from 'lucide-react';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { GameAppIcon } from '~/components/GameAppIcon';
import { HubHeader } from '~/components/hub/HubHeader';
import { HUB_GAMES } from '~/components/hub/hub_games';
import { SIMPLE_GAME_ICONS } from '~/components/pages/simple_game/simple_game_icons';
import { cn } from '~/lib/utils';
import { SIMPLE_GAME_LIST, simpleGameAnalyticsHref, simpleGameListHref } from '~/util/games/kinds';

type AdminChip = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function AdminToolCard({
  href,
  label,
  hint,
  icon: Icon,
  wash,
  iconClass
}: {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  wash: string;
  iconClass: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-border/70 bg-linear-to-br p-3 no-underline',
        'shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        wash
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white shadow-sm',
          iconClass
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </a>
  );
}

function AdminActionChip({ href, label, icon: Icon, name }: AdminChip & { name: string }) {
  return (
    <a
      href={href}
      aria-label={`${name} ${label.toLowerCase()}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5',
        'text-xs font-medium text-slate-700 no-underline transition-colors',
        'hover:border-slate-300 hover:bg-muted dark:text-slate-200 dark:hover:border-slate-600',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {label}
    </a>
  );
}

function AdminGameCard({
  name,
  subtitle,
  icon,
  wash,
  border,
  actions
}: {
  name: string;
  subtitle: string;
  icon: ReactNode;
  wash: string;
  border: string;
  actions: readonly AdminChip[];
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-linear-to-br p-3.5 shadow-sm',
        wash,
        border
      )}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <nav aria-label={`${name} admin`} className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <AdminActionChip key={action.href} {...action} name={name} />
        ))}
      </nav>
    </article>
  );
}

const LIVE_GAMES = [
  {
    name: HUB_GAMES.padavali.name,
    subtitle: HUB_GAMES.padavali.subtitle,
    icon: <GameAppIcon game="padavali" name={HUB_GAMES.padavali.name} size="sm" />,
    wash: 'from-blue-50/90 via-sky-50/40 to-indigo-50/70 dark:from-blue-950/40 dark:via-slate-950/20 dark:to-indigo-950/30',
    border: 'border-blue-200/70 dark:border-blue-800/50',
    actions: [
      { href: '/padavali/list', label: 'Puzzles', icon: List },
      { href: '/padavali/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/padavali/schedules', label: 'Schedules', icon: Calendar },
      { href: '/padavali/batch_manager', label: 'Batches', icon: Images }
    ]
  },
  {
    name: HUB_GAMES.crossword.name,
    subtitle: HUB_GAMES.crossword.subtitle,
    icon: <GameAppIcon game="padajala" name={HUB_GAMES.crossword.name} size="sm" />,
    wash: 'from-amber-50/90 via-orange-50/40 to-amber-50/70 dark:from-amber-950/40 dark:via-stone-950/20 dark:to-orange-950/30',
    border: 'border-amber-200/70 dark:border-amber-800/50',
    actions: [
      { href: '/padajala/list', label: 'Puzzles', icon: List },
      { href: '/padajala/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/padajala/schedules', label: 'Schedules', icon: Calendar },
      { href: '/padajala/batch_manager', label: 'Batches', icon: Images }
    ]
  }
];

export default function AdminPage() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Admin
          </h1>
          <p className="text-sm text-muted-foreground">Puzzles, catalog, and play analytics.</p>
        </header>

        <section aria-label="Catalog and analytics" className="grid gap-2 sm:grid-cols-3">
          <AdminToolCard
            href="/analytics"
            label="Analytics"
            hint="Play volume across every game"
            icon={ChartNoAxesCombined}
            wash="from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30"
            iconClass="from-blue-500 to-indigo-600 shadow-blue-500/25"
          />
          <AdminToolCard
            href="/collections/list"
            label="Collections"
            hint="Playlists spanning all games"
            icon={Layers}
            wash="from-violet-50/90 to-indigo-50/70 dark:from-violet-950/40 dark:to-indigo-950/30"
            iconClass="from-violet-500 to-indigo-600 shadow-violet-500/25"
          />
          <AdminToolCard
            href="/tags/list"
            label="Tags"
            hint="Topics to filter and organize"
            icon={Tag}
            wash="from-teal-50/90 to-cyan-50/70 dark:from-teal-950/40 dark:to-cyan-950/30"
            iconClass="from-teal-500 to-cyan-600 shadow-teal-500/25"
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Games
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {LIVE_GAMES.map((game) => (
              <AdminGameCard key={game.name} {...game} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            In development
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SIMPLE_GAME_LIST.map((game) => {
              const Icon = SIMPLE_GAME_ICONS[game.kind];
              return (
                <AdminGameCard
                  key={game.kind}
                  name={game.name}
                  subtitle={game.subtitle}
                  wash={game.accent.wash}
                  border={game.accent.border}
                  icon={
                    <div
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
                        game.accent.from,
                        game.accent.to
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                  }
                  actions={[
                    { href: simpleGameListHref(game.kind), label: 'Puzzles', icon: List },
                    {
                      href: simpleGameAnalyticsHref(game.kind),
                      label: 'Analytics',
                      icon: BarChart3
                    }
                  ]}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
