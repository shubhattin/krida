import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { ArrowLeftIcon } from 'lucide-react';
import { z } from 'zod';
import CrossWordGameRoot from '~/components/pages/cross_word/CrossWordGame/CrossWordGameRoot';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { crossword_puzzles } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { CACHE } from '~/util/cache.server/cache_loaders';
import { runLoaderEffect } from '~/effect/run';
import { PreviewWarningBanner } from './-PreviewWarningBanner';

const loader$ = createServerFn({ method: 'GET' })
  .validator(z.object({ nano_id: z.string() }))
  .handler(async ({ data }) => {
    const row = await runLoaderEffect(
      dbRunHttp('crossword.view.resolve_uid', (client) =>
        client.query.crossword_puzzles.findFirst({
          columns: { slug: true },
          where: eq(crossword_puzzles.uid, data.nano_id)
        })
      )
    );
    if (!row) return { word_puzzle: null };

    const word_puzzle = await runLoaderEffect(CACHE.crossword.word_puzzle.get({ slug: row.slug }));
    if (!word_puzzle) return { word_puzzle: null };

    return { word_puzzle };
  });

export const Route = createFileRoute('/padajala/(public)/_public/view/$nano_id')({
  loader: async ({ params }) => {
    const { word_puzzle } = await loader$({ data: { nano_id: params.nano_id } });
    if (!word_puzzle) throw notFound();
    return { word_puzzle };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.word_puzzle.title} | Crossword` : 'Not Found',
      description: loaderData ? loaderData.word_puzzle.description : null,
      project: 'padajala',
      robots: 'noindex'
    }),
  component: CrosswordPreviewPage
});

function CrosswordPreviewPage() {
  const { word_puzzle } = Route.useLoaderData();

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <PreviewWarningBanner listed={word_puzzle.listed} slug={word_puzzle.slug} />
      <div className="px-4 pt-3 sm:px-6 sm:pt-4">
        <Link
          to="/padajala"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700 no-underline shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="size-4" />
          Home Page
        </Link>
      </div>
      <CrossWordGameRoot
        puzzle={word_puzzle}
        location="view_page"
        attachments={word_puzzle.attachments}
        image={word_puzzle.image}
      />
    </main>
  );
}
