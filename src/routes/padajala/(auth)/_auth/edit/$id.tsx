import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Provider as JotaiProvider } from 'jotai';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { z } from 'zod';
import { CrossordPuzzleSchemaZod, CrosswordAttachmentSchemaZod } from '~/db/schema_zod';
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
    if (!parsed.success) return { puzzle: null, catalog: { tags: [], collections: [] } };

    const row = await runLoaderEffect(
      dbRunHttp('crossword.admin.get_edit_puzzle', (client) =>
        client.query.crossword_puzzles.findFirst({
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

    if (!row) return { puzzle: null, catalog: { tags: [], collections: [] } };

    const { puzzle_tags, collection_items, ...rest } = row;

    const puzzle = CrossordPuzzleSchemaZod.parse(rest);
    const attachments = row.attachments.map((a) =>
      CrosswordAttachmentSchemaZod.pick({
        id: true,
        type: true,
        url: true,
        title: true,
        order_index: true
      }).parse(a)
    );

    return {
      puzzle: {
        ...puzzle,
        attachments,
        image: row.image
      },
      catalog: {
        tags: puzzle_tags.map((link) => link.tag).sort((a, b) => a.slug.localeCompare(b.slug)),
        collections: collection_items
          .map((item) => item.collection)
          .sort((a, b) => a.title.localeCompare(b.title))
      }
    };
  });

export const Route = createFileRoute('/padajala/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { puzzle, catalog } = await loader$({ data: { rawId: params.id } });
    if (!puzzle) throw notFound();
    return { puzzle, catalog };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.puzzle.title} - Edit` : 'Not Found',
      project: 'padajala'
    }),
  component: CrosswordEditRoute
});

function CrosswordEditRoute() {
  const { puzzle, catalog } = Route.useLoaderData();

  return (
    <>
      <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
        <Link
          to="/padajala/list"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          Main List
        </Link>
        <Link
          to="/padajala/view/$nano_id"
          params={{ nano_id: puzzle.uid }}
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
          title="For sharing unlisted puzzles and internal testing. This page is not the public listed URL."
        >
          <FaPlay className="size-4 shrink-0" />
          Preview Puzzle
        </Link>
      </div>
      <JotaiProvider key={`crossword_edit_${puzzle.id}`}>
        <MainEditPage puzzle={puzzle} catalog={catalog} key={puzzle.id} />
      </JotaiProvider>
    </>
  );
}
