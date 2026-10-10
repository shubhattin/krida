import { dbClient_ext as db, dbDataFileName, queryClient } from './client';
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
  const crossword_puzzles = await db.query.crossword_puzzles.findMany();
  const crossword_redirects = await db.query.crossword_redirects.findMany();
  const crossword_attachments = await db.query.crossword_attachments.findMany();
  const crossword_sessions = await db.query.crossword_sessions.findMany();
  const crossword_gameplay_stats = await db.query.crossword_gameplay_stats.findMany();
  const crossword_schedules = await db.query.crossword_schedules.findMany();
  const tags = await db.query.tags.findMany();
  const collections = await db.query.collections.findMany();
  const padavali_puzzle_tags = await db.query.padavali_puzzle_tags.findMany();
  const crossword_puzzle_tags = await db.query.crossword_puzzle_tags.findMany();
  const padavali_collection_items = await db.query.padavali_collection_items.findMany();
  const crossword_collection_items = await db.query.crossword_collection_items.findMany();
  const dvayi_puzzles = await db.query.dvayi_puzzles.findMany();
  const dvayi_redirects = await db.query.dvayi_redirects.findMany();
  const dvayi_attachments = await db.query.dvayi_attachments.findMany();
  const dvayi_sessions = await db.query.dvayi_sessions.findMany();
  const dvayi_gameplay_stats = await db.query.dvayi_gameplay_stats.findMany();
  const dvayi_puzzle_tags = await db.query.dvayi_puzzle_tags.findMany();
  const dvayi_collection_items = await db.query.dvayi_collection_items.findMany();
  const bhramita_puzzles = await db.query.bhramita_puzzles.findMany();
  const bhramita_redirects = await db.query.bhramita_redirects.findMany();
  const bhramita_attachments = await db.query.bhramita_attachments.findMany();
  const bhramita_sessions = await db.query.bhramita_sessions.findMany();
  const bhramita_gameplay_stats = await db.query.bhramita_gameplay_stats.findMany();
  const bhramita_puzzle_tags = await db.query.bhramita_puzzle_tags.findMany();
  const bhramita_collection_items = await db.query.bhramita_collection_items.findMany();
  const surupa_puzzles = await db.query.surupa_puzzles.findMany();
  const surupa_redirects = await db.query.surupa_redirects.findMany();
  const surupa_attachments = await db.query.surupa_attachments.findMany();
  const surupa_sessions = await db.query.surupa_sessions.findMany();
  const surupa_gameplay_stats = await db.query.surupa_gameplay_stats.findMany();
  const surupa_puzzle_tags = await db.query.surupa_puzzle_tags.findMany();
  const surupa_collection_items = await db.query.surupa_collection_items.findMany();
  const anveshi_puzzles = await db.query.anveshi_puzzles.findMany();
  const anveshi_redirects = await db.query.anveshi_redirects.findMany();
  const anveshi_attachments = await db.query.anveshi_attachments.findMany();
  const anveshi_sessions = await db.query.anveshi_sessions.findMany();
  const anveshi_gameplay_stats = await db.query.anveshi_gameplay_stats.findMany();
  const anveshi_puzzle_tags = await db.query.anveshi_puzzle_tags.findMany();
  const anveshi_collection_items = await db.query.anveshi_collection_items.findMany();

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
    crossword_puzzles,
    crossword_redirects,
    crossword_attachments,
    crossword_sessions,
    crossword_gameplay_stats,
    crossword_schedules,
    tags,
    collections,
    padavali_puzzle_tags,
    crossword_puzzle_tags,
    padavali_collection_items,
    crossword_collection_items,
    dvayi_puzzles,
    dvayi_redirects,
    dvayi_attachments,
    dvayi_sessions,
    dvayi_gameplay_stats,
    dvayi_puzzle_tags,
    dvayi_collection_items,
    bhramita_puzzles,
    bhramita_redirects,
    bhramita_attachments,
    bhramita_sessions,
    bhramita_gameplay_stats,
    bhramita_puzzle_tags,
    bhramita_collection_items,
    surupa_puzzles,
    surupa_redirects,
    surupa_attachments,
    surupa_sessions,
    surupa_gameplay_stats,
    surupa_puzzle_tags,
    surupa_collection_items,
    anveshi_puzzles,
    anveshi_redirects,
    anveshi_attachments,
    anveshi_sessions,
    anveshi_gameplay_stats,
    anveshi_puzzle_tags,
    anveshi_collection_items
  };

  await make_dir('./out');
  await writeFile(`./out/${dbDataFileName}`, JSON.stringify(json_data, null, 2));
};

if (require.main === module) {
  import_data().then(() => {
    queryClient.end();
  });
}

async function confirm_environemnt() {
  const confirmation: string = await take_input(`Are you sure SELECT from ${dbMode} ? `);
  if (['yes', 'y'].includes(confirmation)) return true;
  return false;
}
