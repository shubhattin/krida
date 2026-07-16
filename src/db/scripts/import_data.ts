import { dbClient_ext as db, queryClient } from './client';
import { writeFile } from 'fs/promises';
import { dbMode, make_dir, take_input } from '~/tools/kry.server';

export const import_data = async (confirm_env = true) => {
  if (confirm_env && !(await confirm_environemnt())) return;

  console.log(`Fetching Data from ${dbMode} Database...`);

  const padavali_puzzles = await db.query.padavali_puzzles.findMany();
  const padavali_attachments = await db.query.padavali_attachments.findMany();
  const padavali_gameplay_stats = await db.query.padavali_gameplay_stats.findMany();
  const padavali_schedules = await db.query.padavali_schedules.findMany();
  const padavali_sessions = await db.query.padavali_sessions.findMany();
  const ai_batch_responses = await db.query.ai_batch_responses.findMany();
  const ai_batches = await db.query.ai_batches.findMany();
  const padavali_redirects = await db.query.padavali_redirects.findMany();
  const image_assets = await db.query.image_assets.findMany();
  const crossord_puzzles = await db.query.crossord_puzzles.findMany();

  const json_data = {
    padavali_puzzles,
    padavali_attachments,
    padavali_schedules,
    padavali_sessions,
    padavali_gameplay_stats,
    ai_batch_responses,
    ai_batches,
    padavali_redirects,
    image_assets,
    crossord_puzzles
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
