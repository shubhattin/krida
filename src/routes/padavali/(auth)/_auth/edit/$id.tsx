import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Provider as JotaiProvider } from 'jotai';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { z } from 'zod';
import { adminServerFnMiddleware } from '~/lib/adminServerFn';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { dbRun } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';
import MainEditPage from './-MainEditPage';

const loader$ = createServerFn({ method: 'GET' })
  .middleware([adminServerFnMiddleware])
  .validator(z.object({ rawId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const parsed = z.coerce.number().int().safeParse(data.rawId);
    if (!parsed.success) return { word_puzzle: null };

    const word_puzzle = await runLoaderEffect(
      dbRun('padavali.admin.get_edit_puzzle', (client) =>
        client.query.padavali_puzzles.findFirst({
          where: (tbl, { eq }) => eq(tbl.id, parsed.data),
          with: {
            attachments: {
              columns: {
                id: true,
                type: true,
                url: true,
                title: true,
                order_index: true
              },
              orderBy: (tbl, { asc }) => asc(tbl.order_index)
            },
            image: {
              columns: {
                id: true,
                s3_key: true,
                width: true,
                height: true
              }
            }
          }
        })
      )
    );

    return { word_puzzle: word_puzzle ?? null };
  });

export const Route = createFileRoute('/padavali/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { word_puzzle } = await loader$({ data: { rawId: params.id } });
    if (!word_puzzle) throw notFound();
    return { word_puzzle };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.word_puzzle.title} - Edit` : 'Not Found'
    }),
  component: PadavaliEditRoute
});

function PadavaliEditRoute() {
  const { word_puzzle } = Route.useLoaderData();

  return (
    <>
      <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
        <Link
          to="/padavali/list"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          Main List
        </Link>
        <Link
          to="/padavali/view/$id_slug"
          params={{ id_slug: `${word_puzzle.id}:${word_puzzle.slug}` }}
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
          title="For sharing unlisted puzzles and internal testing. This page is not the public listed URL."
        >
          <FaPlay className="size-4 shrink-0" />
          Preview Puzzle
        </Link>
      </div>
      <JotaiProvider key={`edit_${word_puzzle.id}`}>
        <MainEditPage word_puzzle={word_puzzle} key={word_puzzle.id} />
      </JotaiProvider>
    </>
  );
}
