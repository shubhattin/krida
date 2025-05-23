import { z } from 'zod';
import { db } from '~/db/db';
import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import WordGame from '~/components/pages/main/WordGame/WordGame';
import { get_lang_from_cookie, SCRIPT_DATA_COOKIE_KEY } from '~/state/main.state';
import { cookies } from 'next/headers';

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

  const script = get_lang_from_cookie((await cookies()).get(SCRIPT_DATA_COOKIE_KEY)?.value);

  return (
    <>
      <div className="my-2 mb-3.5 px-2">
        <Link href="/" className="flex items-center gap-1 text-lg font-semibold">
          <IoMdArrowRoundBack className="inline-block text-xl" />
          मुख्यपृष्ठम्
        </Link>
      </div>
      {word_puzzle ? (
        <>
          <WordGame
            script_init={script}
            title={word_puzzle.title}
            word_list={word_puzzle.word_list}
            dims={word_puzzle.grid_dimensions}
            grid_data={word_puzzle.grid_data}
          />
        </>
      ) : (
        <span>अनुचित ID</span>
      )}
    </>
  );
};

export default MainEdit;
