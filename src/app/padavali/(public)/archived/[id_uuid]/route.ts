import { eq } from 'drizzle-orm';
import { notFound, permanentRedirect } from 'next/navigation';
import { db } from '~/db/db';
import { word_puzzles } from '~/db/schema';
import { parseIdSlugParam } from '~/util/puzzle/slug';

type RouteContext = { params: Promise<{ id_uuid: string }> };

/** Legacy archived URLs use `id:uuid`; resolve current slug and 308-redirect for crawlers. */
export async function GET(_request: Request, { params }: RouteContext) {
  const parsed = parseIdSlugParam((await params).id_uuid);
  if (!parsed) notFound();

  const puzzle = await db.query.word_puzzles.findFirst({
    where: eq(word_puzzles.id, parsed.id),
    columns: { slug: true }
  });

  if (!puzzle) notFound();

  permanentRedirect(`/padavali/puzzle/${puzzle.slug}`);
}
