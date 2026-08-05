import { redirect } from 'next/navigation';
import { z } from 'zod';
import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { Provider as JotaiProvider } from 'jotai';
import { getCachedSession } from '~/lib/cache_server_route_data';
import { cache } from 'react';
import { CrossordPuzzleSchemaZod, CrosswordAttachmentSchemaZod } from '~/db/schema_zod';
import MainEditPage from './MainEditPage';
import { runServerEffect } from '~/effect/run';
import { dbRun } from '~/effect/database';

type Props = { params: Promise<{ id: string }> };

const get_crossword_cached = cache(async (id: number) => {
  const row = await runServerEffect(
    dbRun('crossword.admin.get_edit_puzzle', (client) =>
      client.query.crossword_puzzles.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, id),
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
  if (!row) return null;
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
    ...puzzle,
    attachments,
    image: row.image
  };
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
  if (!session || session.user.role !== 'admin') redirect('/padajala');

  const id = z.coerce
    .number()
    .int()
    .parse((await params).id);

  const puzzle = await get_crossword_cached(id);
  if (!puzzle) redirect('/padajala/list');

  return (
    <>
      <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
        <Link
          href="/padajala/list"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          Main List
        </Link>
        <Link
          href={`/padajala/view/${puzzle.id}:${puzzle.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
          title="For sharing unlisted puzzles and internal testing. This page is not the public listed URL."
        >
          <FaPlay className="size-4 shrink-0" />
          Preview
        </Link>
      </div>
      <JotaiProvider key={`crossword_edit_${puzzle.id}`}>
        <MainEditPage puzzle={puzzle} />
      </JotaiProvider>
    </>
  );
};

export default MainEdit;
