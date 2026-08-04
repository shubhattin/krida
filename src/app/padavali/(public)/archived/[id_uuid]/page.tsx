import { eq } from 'drizzle-orm';
import { notFound, permanentRedirect } from 'next/navigation';
import { padavali_puzzles } from '~/db/schema';
import { parseIdSlugParam } from '~/util/puzzle/slug';
import { runServerEffect } from '~/effect/run';
import { dbRun } from '~/effect/database';

type Props = { params: Promise<{ id_uuid: string }> };

/** Legacy archived URLs use `id:uuid`; resolve current slug and 308-redirect for crawlers. */
export default async function ArchivedPuzzlePage({ params }: Props) {
  const parsed = parseIdSlugParam((await params).id_uuid);
  if (!parsed) notFound();

  const puzzle = await runServerEffect(
    dbRun('padavali.archived.resolve_slug', (client) =>
      client.query.padavali_puzzles.findFirst({
        where: eq(padavali_puzzles.id, parsed.id),
        columns: { slug: true }
      })
    )
  );

  if (!puzzle) notFound();

  permanentRedirect(`/padavali/${puzzle.slug}`);
}
