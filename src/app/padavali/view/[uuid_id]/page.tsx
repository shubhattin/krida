import { z } from 'zod';
import { db } from '~/db/db';
import { type Metadata } from 'next';
import Link from 'next/link';
import { IoMdArrowRoundBack } from 'react-icons/io';
import WordGame from '~/components/pages/main/WordGame/WordGameRoot';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { getCachedScript } from '~/lib/cache_server_data';

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

  const script = await getCachedScript();
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await lipi_parivartak(word_puzzle?.title ?? '', DEFAULT_DATA_SCRIPT, script);
  const grid_data = await Promise.all(
    (word_puzzle?.grid_data ?? []).map(
      async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script)
    )
  );

  return (
    <main className="flex flex-1 items-center justify-center">
      <>
        {word_puzzle ? (
          <>
            <WordGame
              location="view_page"
              script={script}
              id={word_puzzle.id}
              uuid={word_puzzle.uuid}
              title={word_puzzle.title}
              description={word_puzzle.description}
              word_list={word_puzzle.word_list}
              dims={word_puzzle.grid_dimensions}
              grid_data={word_puzzle.grid_data}
              initial_script_data={{ word_msgs: word_game_msgs, title, grid_data }}
            >
              <div className="my-3 mb-3 px-4">
                <Link href="/padavali" className="flex items-center gap-1 text-lg font-semibold">
                  <IoMdArrowRoundBack className="inline-block text-xl" />
                  मुख्यपृष्ठम्
                </Link>
              </div>
            </WordGame>
          </>
        ) : (
          <div>अनुचित ID</div>
        )}
      </>
    </main>
  );
};

export default MainEdit;
