import { z } from 'zod';
import { db } from '~/db/db';
import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import WordGame from '~/components/pages/main/WordGame';

type Props = { params: Promise<{ uuid_id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [uuid_str, id_str] = decodeURIComponent((await params).uuid_id).split(':');
  const id = z.coerce.number().int().parse(id_str);
  const uuid = z.string().uuid().parse(uuid_str);

  const word_puzzle = (await db.query.word_puzzles.findFirst({
    where: (tbl, { eq, and }) => and(eq(tbl.id, id), eq(tbl.uuid, uuid)),
    columns: {
      title: true
    }
  }))!;

  return {
    title: word_puzzle.title + ' | पदावली',
    robots: 'noindex'
  };
}

const MainEdit = async ({ params }: Props) => {
  const [uuid_str, id_str] = decodeURIComponent((await params).uuid_id).split(':');
  const id = z.coerce.number().int().parse(id_str);
  const uuid = z.string().uuid().parse(uuid_str);
  const word_puzzle = await db.query.word_puzzles.findFirst({
    where: (tbl, { eq, and }) => and(eq(tbl.id, id), eq(tbl.uuid, uuid))
  });

  return (
    <>
      <div className="my-2 mb-3.5 px-2">
        <Link href="/" className="flex items-center gap-1 text-lg font-semibold">
          <IoMdArrowRoundBack className="inline-block text-xl" />
          Home Page
        </Link>
      </div>
      {word_puzzle ? (
        <>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{word_puzzle.title}</span>
          </div>
          <WordGame
            word_list={word_puzzle.word_list}
            dims={word_puzzle.grid_dimensions}
            grid_data={word_puzzle.grid_data}
          />
        </>
      ) : (
        <span>Invalid ID</span>
      )}
    </>
  );
};

export default MainEdit;
