import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '~/db/db';
import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { FaPlay } from 'react-icons/fa';
import { Provider as JotaiProvider } from 'jotai';
import { getCachedSession } from '~/lib/cache_server_route_data';
import MainEditPage from './MainEditPage';
import { cache } from 'react';

type Props = { params: Promise<{ id: string }> };

const get_word_puzzle_cached_func = cache(async (id: number) => {
  return await db.query.padavali_puzzles.findFirst({
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
  });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = z.coerce
    .number()
    .int()
    .parse((await params).id);

  const word_puzzle = await get_word_puzzle_cached_func(id);

  return {
    title: word_puzzle ? word_puzzle.title + ' - Edit' : 'Not Found'
  };
}

const MainEdit = async ({ params }: Props) => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padavali');

  const id = z.coerce
    .number()
    .int()
    .parse((await params).id);

  const word_puzzle = await get_word_puzzle_cached_func(id);
  if (!word_puzzle) redirect('/padavali/list');

  return (
    <>
      <div className="my-2 mb-3.5 flex items-center gap-6 px-2 sm:gap-9">
        <Link
          href="/padavali/list"
          className="inline-flex items-center gap-1.5 text-lg font-semibold"
        >
          <IoMdArrowRoundBack className="size-5 shrink-0" />
          Main List
        </Link>
        <Link
          href={`/padavali/view/${word_puzzle.id}:${word_puzzle.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-lg font-semibold"
          title="For sharing unlisted puzzles and internal testing. This page is not the public listed URL."
        >
          <FaPlay className="size-4 shrink-0" />
          Preview Puzzle
        </Link>
      </div>
      <JotaiProvider key={`edit_${word_puzzle.id}`}>
        <MainEditPage word_puzzle={word_puzzle} key={word_puzzle.id} />
      </JotaiProvider>
    </>
  );
};

export default MainEdit;
