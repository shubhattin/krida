import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoMdArrowRoundBack } from 'react-icons/io';
import ViewEditPuzzle from '~/components/pages/main/ViewEditPuzzle';
import { type Puzzle } from '~/components/pages/main/ViewEditPuzzle';
import { Provider as JotaiProvider } from 'jotai';
import { getCachedSession } from '~/lib/cache_server_route_data';

const Add = async () => {
  const session = await getCachedSession();
  if (!session || session.user.role !== 'admin') redirect('/padavali');

  const DIMS = [6, 6];

  const word_puzzle: Puzzle = {
    id: null,
    uuid: null,
    created_at: new Date(),
    updated_at: null,
    title: '',
    word_list: ['', ''],
    grid_data: Array.from({ length: DIMS[0] }, () => Array.from({ length: DIMS[1] }, () => '')),
    grid_dimensions: [DIMS[0], DIMS[1]],
    archived: false,
    description: null,
    attachments: []
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
      <JotaiProvider key="add">
        <ViewEditPuzzle word_puzzle={word_puzzle} key="add" location="add_page" />
      </JotaiProvider>
    </>
  );
};

export default Add;

export const metadata: Metadata = {
  title: 'Add New Puzzle'
};
