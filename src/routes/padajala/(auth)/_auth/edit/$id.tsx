import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { Provider as JotaiProvider } from 'jotai';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { z } from 'zod';
import { CrossordPuzzleSchemaZod, CrosswordAttachmentSchemaZod } from '~/db/schema_zod';
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
    if (!parsed.success) return { puzzle: null };

    const row = await runLoaderEffect(
      dbRun('crossword.admin.get_edit_puzzle', (client) =>
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
            }
          }
        })
      )
    );

    if (!row) return { puzzle: null };

    const puzzle = CrossordPuzzleSchemaZod.parse(row);
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
      }
    };
  });

export const Route = createFileRoute('/padajala/(auth)/_auth/edit/$id')({
  loader: async ({ params }) => {
    const { puzzle } = await loader$({ data: { rawId: params.id } });
    if (!puzzle) throw notFound();
    return { puzzle };
  },
  head: ({ loaderData }) =>
    routeHeadFromPageMeta({
      title: loaderData ? `${loaderData.puzzle.title} - Edit` : 'Not Found',
      project: 'padajala'
    }),
  component: CrosswordEditRoute
});

function CrosswordEditRoute() {
  const { puzzle } = Route.useLoaderData();

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
          to="/padajala/view/$id_slug"
          params={{ id_slug: `${puzzle.id}:${puzzle.slug}` }}
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
          title="For sharing unlisted puzzles and internal testing. This page is not the public listed URL."
        >
          <FaPlay className="size-4 shrink-0" />
          Preview Puzzle
        </Link>
      </div>
      <JotaiProvider key={`crossword_edit_${puzzle.id}`}>
        <MainEditPage puzzle={puzzle} key={puzzle.id} />
      </JotaiProvider>
    </>
  );
}
