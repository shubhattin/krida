import { createFileRoute, Link, notFound, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ArrowLeftIcon } from 'lucide-react';
import { z } from 'zod';
import CrossWordGameRoot from '~/components/pages/cross_word/CrossWordGame/CrossWordGameRoot';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { CACHE, NO_CACHE_PARAMS } from '~/util/cache.server/cache_loaders';
import type { CrosswordPuzzleType } from '~/util/cache.server/crossword_cache';
import { dbRun } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';

type SlugResolution =
  | { type: 'puzzle'; puzzle: CrosswordPuzzleType }
  | { type: 'redirect'; targetSlug: string }
  | { type: 'not_found' };

const resolve_puzzle_slug = async (slug: string): Promise<SlugResolution> => {
  const word_puzzle = await runLoaderEffect(CACHE.crossword.word_puzzle.get({ slug }));
  if (word_puzzle) {
    return { type: 'puzzle', puzzle: word_puzzle };
  }

  const redirect_entry = await runLoaderEffect(
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
};

const loader$ = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const resolution = await resolve_puzzle_slug(data.slug);

    if (resolution.type === 'redirect') {
      return { kind: 'redirect' as const, targetSlug: resolution.targetSlug };
    }
    if (resolution.type === 'not_found') {
      return { kind: 'not_found' as const };
    }

    const word_puzzle = resolution.puzzle;

    const current_schedule = await runLoaderEffect(
      CACHE.crossword.current_schedule.get(NO_CACHE_PARAMS)
    );

    if (current_schedule && word_puzzle.id === current_schedule.puzzle.id) {
      return { kind: 'current_puzzle' as const };
    }

    if (!word_puzzle.listed) {
      return {
        kind: 'unavailable' as const,
        title: word_puzzle.title,
        description: word_puzzle.description
      };
    }

    return { kind: 'puzzle' as const, word_puzzle };
  });

export const Route = createFileRoute('/padajala/(public)/_public/$slug')({
  loader: async ({ params }) => {
    const result = await loader$({ data: { slug: params.slug } });

    if (result.kind === 'redirect') {
      throw redirect({
        href: `/padajala/${encodeURIComponent(result.targetSlug)}`,
        statusCode: 301
      });
    }
    if (result.kind === 'not_found') throw notFound();
    if (result.kind === 'current_puzzle') throw redirect({ to: '/padajala' });

    return result;
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData
        ? `${loaderData.kind === 'puzzle' ? loaderData.word_puzzle.title : loaderData.title} - Crossword`
        : 'Not Found',
      description: loaderData
        ? loaderData.kind === 'puzzle'
          ? loaderData.word_puzzle.description
          : loaderData.description
        : null,
      project: 'padajala'
    }),
  component: CrosswordSlugPage
});

function CrosswordSlugPage() {
  const data = Route.useLoaderData();

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="px-4 pt-4 sm:px-6 sm:pt-5">
        <Link
          to="/padajala/puzzles"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Puzzles
        </Link>
      </div>
      {data.kind === 'unavailable' ? (
        <div className="px-4 py-8 text-center text-muted-foreground">
          This puzzle is not available.
        </div>
      ) : (
        <CrossWordGameRoot
          puzzle={data.word_puzzle}
          location="list_page"
          attachments={data.word_puzzle.attachments}
          image={data.word_puzzle.image}
        />
      )}
    </main>
  );
}
