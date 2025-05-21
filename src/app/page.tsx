import { db } from '~/db/db';
import { Metadata } from 'next';
import WordGame from '~/components/pages/main/WordGame';
import Others from './OtherLinks';

export const dynamic = 'force-dynamic';

const get_rand_num = (a: number, b: number) => {
  return Math.trunc(Math.random() * (b - a + 1)) + a;
};

export default async function Home() {
  // const currentTime = new Date();
  const list = await db.query.word_puzzles.findMany({
    columns: {
      id: true
    },
    limit: 10,
    orderBy: ({ created_at }, { desc }) => desc(created_at)
  });

  const randomIndex = get_rand_num(0, list.length - 1);
  const word_puzzle = (await db.query.word_puzzles.findFirst({
    where: ({ id }, { eq }) => eq(id, list[randomIndex].id)
  }))!;

  return (
    <>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="mt-6 sm:mt-10">
          <div className="flex flex-col items-end justify-end">
            <Others />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{word_puzzle.title}</span>
          </div>
          {/* <div>Random Selection: {randomIndex}</div>
          <div>Curent Server Time : {currentTime.toLocaleString()}</div> */}
          <WordGame
            grid_data={word_puzzle.grid_data}
            dims={word_puzzle.grid_dimensions}
            word_list={word_puzzle.word_list}
          />
        </div>
      </main>
    </>
  );
}

export const metadata: Metadata = {
  title: 'पदावली'
};
