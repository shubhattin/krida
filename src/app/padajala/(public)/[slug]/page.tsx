import { type Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { cache, Suspense } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import CrossWordGameRoot from '~/components/pages/cross_word/CrossWordGame/CrossWordGameRoot';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import type { CrosswordPuzzleType } from '~/util/cache.server/crossword_cache';
import { getMetadata } from '~/components/tags/getPageMetaTags';
import { runServerEffect } from '~/effect/run';
import { dbRun } from '~/effect/database';

type Props = { params: Promise<{ slug: string }> };

type SlugResolution =
  | { type: 'puzzle'; puzzle: CrosswordPuzzleType }
  | { type: 'redirect'; targetSlug: string }
  | { type: 'not_found' };

const resolve_puzzle_slug = cache(async (slug: string): Promise<SlugResolution> => {
  const word_puzzle = await runServerEffect(CACHE.crossword.word_puzzle.get({ slug }));
  if (word_puzzle) {
    return { type: 'puzzle', puzzle: word_puzzle };
  }

  const redirect_entry = await runServerEffect(
    dbRun('crossword.resolve_puzzle_slug_redirect', (client) =>
      client.query.crossword_redirects.findFirst({
        where: (tbl, { eq }) => eq(tbl.slug, slug),
        with: {
          puzzle: {
            columns: { slug: true }
          }
        }
      })
    )
  );

  if (redirect_entry?.puzzle?.slug) {
    return { type: 'redirect', targetSlug: redirect_entry.puzzle.slug };
  }

  return { type: 'not_found' };
});

const get_puzzle_for_metadata = async (slug: string) => {
  const resolution = await resolve_puzzle_slug(slug);
  if (resolution.type === 'puzzle') {
    return resolution.puzzle;
  }
  if (resolution.type === 'redirect') {
    return runServerEffect(CACHE.crossword.word_puzzle.get({ slug: resolution.targetSlug }));
  }
  return undefined;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent((await params).slug);
  const word_puzzle = await get_puzzle_for_metadata(slug);

  return {
    ...getMetadata({
      title: word_puzzle ? `${word_puzzle.title} - Crossword` : 'Not Found',
      description: word_puzzle ? word_puzzle.description : null,
      project: 'padajala'
    })
  };
}

export default async function CrosswordSlugPage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Suspense fallback={<PuzzleLoadingSkeleton />}>
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <Link
            href="/padajala/puzzles"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Puzzles
          </Link>
        </div>
        <CrosswordPlaySuspense slug={slug} />
      </Suspense>
    </main>
  );
}

const CrosswordPlaySuspense = async ({ slug }: { slug: string }) => {
  const resolution = await resolve_puzzle_slug(slug);

  if (resolution.type === 'redirect') {
    permanentRedirect(`/padajala/${encodeURIComponent(resolution.targetSlug)}`);
  }

  if (resolution.type === 'not_found') {
    notFound();
  }

  const word_puzzle = resolution.puzzle;

  const current_schedule = await runServerEffect(
    CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS)
  );

  if (current_schedule && word_puzzle.id === current_schedule.puzzle.id) {
    redirect('/padajala');
  }

  if (!word_puzzle.listed) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground">
        This puzzle is not available.
      </div>
    );
  }

  return (
    <CrossWordGameRoot
      puzzle={word_puzzle}
      location="list_page"
      attachments={word_puzzle.attachments}
      image={word_puzzle.image}
    />
  );
};

const PuzzleLoadingSkeleton = () => {
  return (
    <div className="w-full px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="mx-auto h-10 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto h-80 w-full animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
};
