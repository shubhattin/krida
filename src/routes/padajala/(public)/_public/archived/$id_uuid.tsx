import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { parseIdSlugParam } from '~/util/puzzle/slug';
import { dbRunHttp } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';

const loader$ = createServerFn({ method: 'GET' })
  .validator(z.object({ id_uuid: z.string() }))
  .handler(async ({ data }) => {
    const parsed = parseIdSlugParam(data.id_uuid);
    if (!parsed) return { slug: null };

    const puzzle = await runLoaderEffect(
      dbRunHttp('crossword.archived.resolve_slug', (client) =>
        client.query.puzzles.findFirst({
          where: (tbl, { and, eq }) => and(eq(tbl.id, parsed.id), eq(tbl.kind, 'crossword')),
          columns: { slug: true }
        })
      )
    );

    return { slug: puzzle?.slug ?? null };
  });

/** Legacy archived URLs use `id:uuid`; resolve current slug and 301-redirect for crawlers. */
export const Route = createFileRoute('/padajala/(public)/_public/archived/$id_uuid')({
  loader: async ({ params }) => {
    const { slug } = await loader$({ data: { id_uuid: params.id_uuid } });
    if (!slug) throw notFound();

    throw redirect({
      href: `/padajala/${encodeURIComponent(slug)}`,
      statusCode: 301
    });
  }
});
