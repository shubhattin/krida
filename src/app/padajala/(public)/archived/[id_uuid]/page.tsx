import { eq } from 'drizzle-orm';
import { notFound, permanentRedirect } from 'next/navigation';
import { crossword_puzzles } from '~/db/schema';
import { parseIdSlugParam } from '~/util/puzzle/slug';
import { runServerEffect } from '~/effect/run';
import { dbRun } from '~/effect/database';

type Props = { params: Promise<{ id_uuid: string }> };

/** Legacy archived URLs use `id:uuid`; resolve current slug and 308-redirect for crawlers. */
export default async function ArchivedCrosswordPage({ params }: Props) {
  const parsed = parseIdSlugParam((await params).id_uuid);
  if (!parsed) notFound();

  const puzzle = await runServerEffect(
    dbRun('crossword.archived.resolve_slug', (client) =>
      client.query.crossword_puzzles.findFirst({
        where: eq(crossword_puzzles.id, parsed.id),
        columns: { slug: true }
      })
    )
  );

  if (!puzzle) notFound();

  permanentRedirect(`/padajala/${puzzle.slug}`);
}
