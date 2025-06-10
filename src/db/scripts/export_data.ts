import { dbClient_ext as db, queryClient } from './client';
import { readFile } from 'fs/promises';
import { dbMode, take_input } from '~/tools/kry.server';
import { puzzle_gameplay_stats, word_puzzles } from '~/db/schema';
import { WordPuzzleSchemaZod, PuzzleGamePlayStatsSchemaZod } from '~/db/schema_zod';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import chalk from 'chalk';

const main = async () => {
  /*
   Better backup & restore tools like `pg_dump` and `pg_restore` should be used.
  
   Although Here the foriegn key relations are not that complex so we are doing it manually
  */
  if (!(await confirm_environemnt())) return;

  console.log(`Insering Data into ${dbMode} Database...`);

  const in_file_name = {
    PROD: 'db_data_prod.json',
    PREVIEW: 'db_data_preview.json',
    LOCAL: 'db_data.json'
  }[dbMode];

  const data = z
    .object({
      word_puzzles: WordPuzzleSchemaZod.array(),
      puzzle_gameplay_stats: PuzzleGamePlayStatsSchemaZod.array()
    })
    .parse(JSON.parse((await readFile(`./out/${in_file_name}`)).toString()));

  // deleting all the tables initially
  try {
    await db.delete(word_puzzles);
    await db.delete(puzzle_gameplay_stats);
    console.log(chalk.green('✓ Deleted All Tables Successfully'));
  } catch (e) {
    console.log(chalk.red('✗ Error while deleting tables:'), chalk.yellow(e));
  }

  // inserting word_puzzles
  try {
    await db.insert(word_puzzles).values(data.word_puzzles);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`word_puzzles`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting word_puzzles:'), chalk.yellow(e));
  }

  // inserting puzzle_gameplay_stats
  try {
    await db.insert(puzzle_gameplay_stats).values(data.puzzle_gameplay_stats);
    console.log(
      chalk.green('✓ Successfully added values into table'),
      chalk.blue('`puzzle_gameplay_stats`')
    );
  } catch (e) {
    console.log(chalk.red('✗ Error while inserting puzzle_gameplay_stats:'), chalk.yellow(e));
  }

  // resetting SERIAL
  try {
    await db.execute(
      sql`SELECT setval('"word_puzzles_id_seq"', (select MAX(id) from "word_puzzles"))`
    );
    await db.execute(
      sql`SELECT setval('"puzzle_gameplay_stats_id_seq"', (select MAX(id) from "puzzle_gameplay_stats"))`
    );
    console.log(chalk.green('✓ Successfully resetted ALL SERIAL'));
  } catch (e) {
    console.log(chalk.red('✗ Error while resetting SERIAL:'), chalk.yellow(e));
  }
};
main().then(() => {
  queryClient.end();
});

async function confirm_environemnt() {
  let confirmation: string = await take_input(`Are you sure INSERT in ${dbMode} ? `);
  if (['yes', 'y'].includes(confirmation)) return true;
  return false;
}
