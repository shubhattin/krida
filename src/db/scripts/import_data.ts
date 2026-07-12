import { dbClient_ext as db, queryClient } from './client';
import { writeFile } from 'fs/promises';
import { dbMode, make_dir, take_input } from '~/tools/kry.server';

export const import_data = async (confirm_env = true) => {
  if (confirm_env && !(await confirm_environemnt())) return;

  console.log(`Fetching Data from ${dbMode} Database...`);

  const word_puzzles = await db.query.word_puzzles.findMany();
  const word_puzzle_attachments = await db.query.word_puzzle_attachments.findMany();
  const puzzle_gameplay_stats = await db.query.puzzle_gameplay_stats.findMany();
  const puzzle_game_schedules = await db.query.puzzle_game_schedules.findMany();
  const puzzle_gameplay_sessions = await db.query.puzzle_gameplay_sessions.findMany();
  const ai_batch_responses = await db.query.ai_batch_responses.findMany();
  const ai_batches = await db.query.ai_batches.findMany();
  const word_puzzle_redirects = await db.query.word_puzzle_redirects.findMany();
  const image_assets = await db.query.image_assets.findMany();

  const json_data = {
    word_puzzles,
    word_puzzle_attachments,
    puzzle_game_schedules,
    puzzle_gameplay_sessions,
    puzzle_gameplay_stats,
    ai_batch_responses,
    ai_batches,
    word_puzzle_redirects,
    image_assets
  };

  await make_dir('./out');
  const out_file_name = {
    PROD: 'db_data_prod.json',
    PREVIEW: 'db_data_preview.json',
    LOCAL: 'db_data.json'
  }[dbMode];
  await writeFile(`./out/${out_file_name}`, JSON.stringify(json_data, null, 2));
};

if (require.main === module) {
  import_data().then(() => {
    queryClient.end();
  });
}

async function confirm_environemnt() {
  let confirmation: string = await take_input(`Are you sure SELECT from ${dbMode} ? `);
  if (['yes', 'y'].includes(confirmation)) return true;
  return false;
}
