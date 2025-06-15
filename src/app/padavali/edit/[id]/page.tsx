import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';
import { z } from 'zod';
import { db } from '~/db/db';
import ViewEditPuzzle from '~/components/pages/main/ViewEditPuzzle';
import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { Provider as JotaiProvider } from 'jotai';
import { getCachedSession } from '~/lib/cache_server_data';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = z.coerce
    .number()
    .int()
    .parse((await params).id);

  const word_puzzle = (await db.query.word_puzzles.findFirst({
    where: (tbl, { eq }) => eq(tbl.id, id),
    columns: {
      title: true
    }
  }))!;

  return {
    title: word_puzzle.title + ' - Edit'
  };
}

const MainEdit = async ({ params }: Props) => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin' || !session.user.is_approved) redirect('/padavali');

  const id = z.coerce
    .number()
    .int()
    .parse((await params).id);

  const word_puzzle = (await db.query.word_puzzles.findFirst({
    where: (tbl, { eq }) => eq(tbl.id, id)
  }))!;

  return (
    <>
      <div className="my-2 mb-3.5 flex space-x-6 px-2 sm:space-x-9">
        <Link
          href="/padavali/list"
          className="inline-flex items-center gap-1 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="inline-block text-xl" />
          मुख्यसूची
        </Link>
        <Link
          href={`/padavali/view/${word_puzzle.uuid}:${word_puzzle.id}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
        >
          <FaPlay className="inline-block text-lg" />
          क्रीड्यताम्
        </Link>
      </div>
      <JotaiProvider key={`edit_${word_puzzle.id}`}>
        <ViewEditPuzzle word_puzzle={word_puzzle} key={word_puzzle.id} />
      </JotaiProvider>
    </>
  );
};

export default MainEdit;
