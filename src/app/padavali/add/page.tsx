import { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoMdArrowRoundBack } from 'react-icons/io';
import ViewEditPuzzle from '~/components/pages/main/ViewEditPuzzle';
import { type Puzzle } from '~/components/pages/main/ViewEditPuzzle';
import get_seesion_from_cookie from '~/lib/get_auth_from_cookie';

const Add = async () => {
  const session = await get_seesion_from_cookie((await headers()).get('cookie') ?? '');
  if (!session) redirect('/padavali');
  if (session.user.role !== 'admin' || !session.user.is_approved) redirect('/padavali');

  const DIMS = [6, 6];

  const word_puzzle: Puzzle = {
    id: null,
    uuid: null,
    created_at: new Date(),
    updated_at: null,
    title: '',
    word_list: ['', ''],
    grid_data: Array.from({ length: DIMS[0] }, () => Array.from({ length: DIMS[1] }, () => '')),
    grid_dimensions: [DIMS[0], DIMS[1]]
  };
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
      </div>
      <div className="ml-3 text-xl font-bold">नवप्रहेलिकायाः योजनम्</div>
      <ViewEditPuzzle word_puzzle={word_puzzle} key={word_puzzle.id} />
    </>
  );
};

export default Add;

export const metadata: Metadata = {
  title: 'Add New Puzzle'
};
