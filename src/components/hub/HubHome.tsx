'use client';

import { useContext, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import type { HubData } from './hub_data';
import { HUB_GAMES } from './hub_games';
import { tagsByPopularity, type HubPuzzle } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';
import { HubPuzzleCard } from './HubPuzzleCard';
import { TodayPuzzleTile } from './TodayPuzzleTile';
import { CollectionFeatureCard } from './CollectionFeatureCard';
import { formatMastheadDate } from './hub_time';

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
};

export default function HubHome({ data }: { data: HubData }) {
  const { puzzles } = useHubPuzzles(data);
  const { script, setScript } = useContext(AppContext);
  const tags = tagsByPopularity(puzzles).slice(0, 18);
  const archive = mixedArchive(puzzles, 8);
  const masthead = formatMastheadDate(new Date());

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-10 sm:px-6 sm:py-14">
      <motion.header
        initial="hidden"
        animate="show"
        variants={fade}
        className="flex flex-col items-center gap-3 text-center"
      >
        <p
          className="font-serif text-lg text-muted-foreground italic sm:text-xl"
          suppressHydrationWarning
        >
          {masthead.weekdaySanskrit}
        </p>
        <h1
          className="font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl"
          suppressHydrationWarning
        >
          {masthead.dateLabel}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Today&apos;s Sanskrit puzzles, then a few things worth lingering over.
        </p>
      </motion.header>

      <section className="flex flex-col gap-5">
        <SectionHeading kicker="Play" title="Today's puzzles" />
        <div className="grid gap-5 lg:grid-cols-2">
          <TodayPuzzleTile
            game={HUB_GAMES.padavali}
            puzzle={data.padavali.today}
            nextStart={data.padavali.next_start}
          />
          <TodayPuzzleTile
            game={HUB_GAMES.crossword}
            puzzle={data.crossword.today}
            nextStart={data.crossword.next_start}
          />
        </div>
      </section>

      {data.collections.length > 0 ? (
        <section className="flex flex-col gap-5">
          <SectionHeading
            kicker="Curated"
            title="Collections"
            action={
              <Link
                to="/explore"
                search={{ view: 'collections' }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground"
              >
                All collections
                <ArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {data.collections.slice(0, 4).map((collection) => (
              <CollectionFeatureCard key={collection.uid} collection={collection} />
            ))}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="flex flex-col gap-5">
          <SectionHeading kicker="Browse" title="Explore by topic" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                to="/explore"
                search={{ tag: tag.slug }}
                className="flex flex-col gap-1 rounded-xl border border-border/80 bg-card px-3.5 py-3 no-underline transition-colors hover:border-foreground/25 hover:bg-muted/40"
              >
                <span className="text-sm font-medium">{tag.name}</span>
                <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  {tag.count} puzzle{tag.count === 1 ? '' : 's'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-5">
        <SectionHeading
          kicker="Archive"
          title="From the archive"
          action={
            <div className="flex items-center gap-3">
              <ScriptSelector script={script} onScriptChange={setScript} />
              <Link
                to="/explore"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:text-foreground"
              >
                Browse all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {archive.map((puzzle) => (
            <HubPuzzleCard key={puzzle.key} puzzle={puzzle} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  action
}: {
  kicker: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {kicker}
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {action ?? null}
    </div>
  );
}

function mixedArchive(puzzles: HubPuzzle[], limit: number): HubPuzzle[] {
  const padavali = puzzles.filter((puzzle) => puzzle.game === 'padavali');
  const crossword = puzzles.filter((puzzle) => puzzle.game === 'crossword');
  const mixed: HubPuzzle[] = [];
  const max = Math.max(padavali.length, crossword.length);
  for (let i = 0; i < max && mixed.length < limit; i++) {
    const nextPadavali = padavali[i];
    const nextCrossword = crossword[i];
    if (nextPadavali) mixed.push(nextPadavali);
    if (mixed.length < limit && nextCrossword) mixed.push(nextCrossword);
  }
  return mixed;
}
