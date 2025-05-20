import { db } from '@/db/db';
import { Metadata } from 'next';
import WordGame from './WordGame';

export default async function Home() {
  const list = await db.query.word_puzzles.findMany({
    columns: {
      id: true
    },
    limit: 10,
    orderBy: ({ created_at }, { desc }) => desc(created_at)
  });

  const GRID_DIMENSIONS = [6, 6];
  const grid_data = [
    ['सं', 'हा', 'र', 'ना', 'सी', 'क्रो'],
    ['का', 'रू', 'भी', 'ष', 'ण', 'ध'],
    ['अ', 'धा', 'जा', 'वा', 'रा', 'की'],
    ['उन्', 'सि', 'शा', 'सा', 'ध', 'वि'],
    ['म', 'रा', 'तां', 'ग', 'ल', 'चं'],
    ['त्त', 'धू', 'क', 'पा', 'ड', 'रा']
  ];
  const word_list = ['संहार', 'भीषण', 'क्रोध', 'असितांग', 'कपाल', 'उन्मत्त', 'चंड'];

  return (
    <>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="mt-4 sm:mt-8">
          <WordGame grid_data={grid_data} dims={GRID_DIMENSIONS} word_list={word_list} />
          {list.length}
        </div>
      </main>
    </>
  );
}

export const metadata: Metadata = {
  title: 'पदावली'
};
