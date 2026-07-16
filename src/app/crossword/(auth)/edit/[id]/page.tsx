import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '~/db/db';
import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { Provider as JotaiProvider } from 'jotai';
import { getCachedSession } from '~/lib/cache_server_route_data';
import { cache } from 'react';
import { CrossordPuzzleSchemaZod } from '~/db/schema_zod';
import ViewEditCrossword from '~/components/pages/cross_word/ViewEditCrossword';

type Props = { params: Promise<{ id: string }> };

const get_crossword_cached = cache(async (id: number) => {
  const row = await db.query.crossword_puzzles.findFirst({
    where: (tbl, { eq }) => eq(tbl.id, id)
  });
  if (!row) return null;
  return CrossordPuzzleSchemaZod.parse(row);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = z.coerce
    .number()
    .int()
    .parse((await params).id);

  const puzzle = await get_crossword_cached(id);

  return {
    title: puzzle ? puzzle.title + ' - Edit' : 'Not Found'
  };
}

const MainEdit = async ({ params }: Props) => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/crossword');

  const id = z.coerce
    .number()
    .int()
    .parse((await params).id);

  const puzzle = await get_crossword_cached(id);
  if (!puzzle) redirect('/crossword/list');

  return (
    <>
      <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
        <Link
          href="/crossword/list"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          Main List
        </Link>
        <Link
          href="/crossword"
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
          title="Open the public crossword page"
        >
          <FaPlay className="size-4 shrink-0" />
          Public Page
        </Link>
      </div>
      <JotaiProvider key={`crossword_edit_${puzzle.id}`}>
        <ViewEditCrossword puzzle={puzzle} key={puzzle.id} />
      </JotaiProvider>
    </>
  );
};

export default MainEdit;
