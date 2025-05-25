import { db } from '~/db/db';
import { Metadata } from 'next';
import WordGame from '~/components/pages/main/WordGame/WordGame';
import { cookies } from 'next/headers';
import {
  DEFAULT_DATA_SCRIPT,
  get_lang_from_cookie,
  SCRIPT_DATA_COOKIE_KEY
} from '~/state/script_font_data';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/word_game_msgs';
import { lipi_parivartak } from '~/tools/lipi_lekhika';

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

  const script = get_lang_from_cookie((await cookies()).get(SCRIPT_DATA_COOKIE_KEY)?.value);
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await lipi_parivartak(word_puzzle.title, DEFAULT_DATA_SCRIPT, script);
  const grid_data = await Promise.all(
    word_puzzle.grid_data.map(
      async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script)
    )
  );

  return (
    <main className="min-h-screen w-full">
      {/* <div>Random Selection: {randomIndex}</div>
        <div>Curent Server Time : {currentTime.toLocaleString()}</div> */}
      <WordGame
        title={word_puzzle.title}
        grid_data={word_puzzle.grid_data}
        dims={word_puzzle.grid_dimensions}
        word_list={word_puzzle.word_list}
        initial_script_data={{ word_msgs: word_game_msgs, title, grid_data }}
      />
    </main>
  );
}

export const metadata: Metadata = {
  title: 'पदावली'
};
