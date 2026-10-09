'use client';

import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  ChartNoAxesCombined,
  Images,
  Layers,
  List,
  Tag
} from 'lucide-react';
import { AllGamesMenuItems } from '~/components/app-bar/GameMenuItems';
import { GameAppIcon } from '~/components/GameAppIcon';
import { HubHeader } from '~/components/hub/HubHeader';
import { HUB_GAMES } from '~/components/hub/hub_games';
import { cn } from '~/lib/utils';

function AdminLinkCard({
  to,
  label,
  description,
  icon
}: {
  to:
    | '/analytics'
    | '/padavali/list'
    | '/padavali/schedules'
    | '/padavali/analytics'
    | '/padavali/batch_manager'
    | '/padajala/list'
    | '/padajala/schedules'
    | '/padajala/analytics'
    | '/padajala/batch_manager'
    | '/collections/list'
    | '/tags/list';
  label: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 p-4 no-underline',
        'shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
        'dark:hover:border-slate-600'
      )}
    >
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-50">
          <span className="truncate">{label}</span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function AdminSection({
  title,
  description,
  icon,
  children
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function AdminPage() {
  return (
    <div className="public-canvas flex min-h-dvh flex-col">
      <HubHeader gameMenuItems={<AllGamesMenuItems />} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            Admin
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Central place to manage puzzles, schedules, analytics, collections, and tags across
            Padāvalī and Padajāla.
          </p>
        </div>

        <AdminSection
          title="Overview"
          description="Cross-game pulse of play activity."
          icon={
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <ChartNoAxesCombined className="size-5" />
            </div>
          }
        >
          <AdminLinkCard
            to="/analytics"
            label="All analytics"
            description="Combined play volume and signed-in player trends."
            icon={<ChartNoAxesCombined className="size-5" />}
          />
        </AdminSection>

        <AdminSection
          title={HUB_GAMES.padavali.name}
          description="Word-search puzzles, schedules, and tools."
          icon={<GameAppIcon game="padavali" name={HUB_GAMES.padavali.name} size="sm" />}
        >
          <AdminLinkCard
            to="/padavali/list"
            label="Manage puzzles"
            description="Create, edit, and publish word-search puzzles."
            icon={<List className="size-5" />}
          />
          <AdminLinkCard
            to="/padavali/schedules"
            label="Schedules"
            description="Plan what is live today and what’s next."
            icon={<Calendar className="size-5" />}
          />
          <AdminLinkCard
            to="/padavali/analytics"
            label="Analytics"
            description="Play volume and puzzle performance."
            icon={<BarChart3 className="size-5" />}
          />
          <AdminLinkCard
            to="/padavali/batch_manager"
            label="Batches"
            description="Bulk image and batch tooling."
            icon={<Images className="size-5" />}
          />
        </AdminSection>

        <AdminSection
          title={HUB_GAMES.crossword.name}
          description="Crossword puzzles, schedules, and tools."
          icon={<GameAppIcon game="padajala" name={HUB_GAMES.crossword.name} size="sm" />}
        >
          <AdminLinkCard
            to="/padajala/list"
            label="Manage puzzles"
            description="Create, edit, and publish crossword puzzles."
            icon={<List className="size-5" />}
          />
          <AdminLinkCard
            to="/padajala/schedules"
            label="Schedules"
            description="Plan what is live today and what’s next."
            icon={<Calendar className="size-5" />}
          />
          <AdminLinkCard
            to="/padajala/analytics"
            label="Analytics"
            description="Play volume and puzzle performance."
            icon={<BarChart3 className="size-5" />}
          />
          <AdminLinkCard
            to="/padajala/batch_manager"
            label="Batches"
            description="Bulk image and batch tooling."
            icon={<Images className="size-5" />}
          />
        </AdminSection>

        <AdminSection
          title="Catalog"
          description="Shared collections and tags used by every game."
          icon={
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25">
              <Layers className="size-5" />
            </div>
          }
        >
          <AdminLinkCard
            to="/collections/list"
            label="Collections"
            description="Curated playlists spanning both games."
            icon={<Layers className="size-5" />}
          />
          <AdminLinkCard
            to="/tags/list"
            label="Tags"
            description="Topics used to filter and organize puzzles."
            icon={<Tag className="size-5" />}
          />
        </AdminSection>
      </main>
    </div>
  );
}
