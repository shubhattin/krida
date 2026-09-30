import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Provider as JotaiProvider } from 'jotai';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { z } from 'zod';
import { adminServerFnMiddleware } from '~/lib/adminServerFn';
import { routeHeadFromPageMeta } from '~/components/tags/getPageMetaTags';
import { dbRunHttp } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';
import MainEditPage from './-MainEditPage';

const loader$ = createServerFn({ method: 'GET' })
  .middleware([adminServerFnMiddleware])
  .validator(z.object({ rawId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const parsed = z.coerce.number().int().safeParse(data.rawId);
    if (!parsed.success) return { word_puzzle: null, catalog: { tags: [], collections: [] } };

    const word_puzzle = await runLoaderEffect(
      dbRunHttp('padavali.admin.get_edit_puzzle', (client) =>
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
            },
            puzzle_tags: {
              with: {
                tag: { columns: { id: true, slug: true, name: true } }
              }
            },
            collection_items: {
              with: {
                collection: { columns: { id: true, uid: true, slug: true, title: true } }
              }
            }
          }
        })
      )
    );

    if (!word_puzzle) return { word_puzzle: null, catalog: { tags: [], collections: [] } };

    const { puzzle_tags, collection_items, ...puzzle } = word_puzzle;
    return {
      word_puzzle: puzzle,
      catalog: {
        tags: puzzle_tags.map((link) => link.tag).sort((a, b) => a.slug.localeCompare(b.slug)),
        collections: collection_items
          .map((item) => item.collection)
          .sort((a, b) => a.title.localeCompare(b.title))
      }
    };
  });

export const Route = createFileRoute('/padavali/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { word_puzzle, catalog } = await loader$({ data: { rawId: params.id } });
    if (!word_puzzle) throw notFound();
    return { word_puzzle, catalog };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.word_puzzle.title} - Edit` : 'Not Found'
    }),
  component: PadavaliEditRoute
});

function PadavaliEditRoute() {
  const { word_puzzle, catalog } = Route.useLoaderData();

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
          to="/padavali/view/$nano_id"
          params={{ nano_id: word_puzzle.uid }}
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
          title="For sharing unlisted puzzles and internal testing. This page is not the public listed URL."
        >
          <FaPlay className="size-4 shrink-0" />
          Preview Puzzle
        </Link>
      </div>
      <JotaiProvider key={`edit_${word_puzzle.id}`}>
        <MainEditPage word_puzzle={word_puzzle} catalog={catalog} key={word_puzzle.id} />
      </JotaiProvider>
    </>
  );
}
