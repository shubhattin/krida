import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { padavali_puzzles } from '~/db/schema';
import { parseIdSlugParam } from '~/util/puzzle/slug';
import { dbRun } from '~/effect/database';
import { runLoaderEffect } from '~/effect/run';

const loader$ = createServerFn({ method: 'GET' })
  .validator(z.object({ id_uuid: z.string() }))
  .handler(async ({ data }) => {
    const parsed = parseIdSlugParam(data.id_uuid);
    if (!parsed) return { slug: null };

    const puzzle = await runLoaderEffect(
      dbRun('padavali.archived.resolve_slug', (client) =>
        client.query.padavali_puzzles.findFirst({
          where: eq(padavali_puzzles.id, parsed.id),
          columns: { slug: true }
        })
      )
    );

    return { slug: puzzle?.slug ?? null };
  });

/** Legacy archived URLs use `id:uuid`; resolve current slug and 301-redirect for crawlers. */
export const Route = createFileRoute('/padavali/(public)/_public/archived/$id_uuid')({
  loader: async ({ params }) => {
    const { slug } = await loader$({ data: { id_uuid: params.id_uuid } });
    if (!slug) throw notFound();

    throw redirect({
      href: `/padavali/${encodeURIComponent(slug)}`,
      statusCode: 301
    });
  }
});
