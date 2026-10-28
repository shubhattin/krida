import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dbClient_ext as db, dbDataFilePath, queryClient } from './client';
import { dbMode, make_dir, take_input } from '~/tools/kry.server';

/**
 * Dumps the current (post-unification) tables through Drizzle.
 * The pre-unification JSON shape is `backup_json.ts`.
 */

export const import_data = async (confirm_env = true) => {
  if (confirm_env && !(await confirm_environment())) return;

  console.log(`Fetching Data from ${dbMode} Database...`);

  const [
    image_assets,
    tags,
    collections,
    image_system_prompt_templates,
    ai_batches,
    ai_batch_responses,
    puzzles,
    padavali_puzzles,
    padajala_puzzles,
    dvayi_puzzles,
    bhramita_puzzles,
    surupa_puzzles,
    anveshi_puzzles,
    puzzle_tags,
    collection_items,
    puzzle_redirects,
    puzzle_attachments,
    puzzle_schedules,
    puzzle_sessions,
    attempt_gameplay_stats,
    padajala_gameplay_stats,
    agent_chats,
    agent_messages,
    agent_chat_puzzles
  ] = await Promise.all([
    db.query.image_assets.findMany(),
    db.query.tags.findMany(),
    db.query.collections.findMany(),
    db.query.image_system_prompt_templates.findMany(),
    db.query.ai_batches.findMany(),
    db.query.ai_batch_responses.findMany(),
    db.query.puzzles.findMany(),
    db.query.padavali_puzzles.findMany(),
    db.query.padajala_puzzles.findMany(),
    db.query.dvayi_puzzles.findMany(),
    db.query.bhramita_puzzles.findMany(),
    db.query.surupa_puzzles.findMany(),
    db.query.anveshi_puzzles.findMany(),
    db.query.puzzle_tags.findMany(),
    db.query.collection_items.findMany(),
    db.query.puzzle_redirects.findMany(),
    db.query.puzzle_attachments.findMany(),
    db.query.puzzle_schedules.findMany(),
    db.query.puzzle_sessions.findMany(),
    db.query.attempt_gameplay_stats.findMany(),
    db.query.padajala_gameplay_stats.findMany(),
    db.query.agent_chats.findMany(),
    db.query.agent_messages.findMany(),
    db.query.agent_chat_puzzles.findMany()
  ]);

  const json_data = {
    image_assets,
    tags,
    collections,
    image_system_prompt_templates,
    ai_batches,
    ai_batch_responses,
    puzzles,
    padavali_puzzles,
    padajala_puzzles,
    dvayi_puzzles,
    bhramita_puzzles,
    surupa_puzzles,
    anveshi_puzzles,
    puzzle_tags,
    collection_items,
    puzzle_redirects,
    puzzle_attachments,
    puzzle_schedules,
    puzzle_sessions,
    attempt_gameplay_stats,
    padajala_gameplay_stats,
    agent_chats,
    agent_messages,
    agent_chat_puzzles
  };

  await make_dir(path.dirname(dbDataFilePath));
  await writeFile(dbDataFilePath, JSON.stringify(json_data, null, 2));
};

if (require.main === module) {
  import_data()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => {
      void queryClient.end();
    });
}

async function confirm_environment() {
  const confirmation = await take_input(`Are you sure SELECT from ${dbMode} ? `);
  return ['yes', 'y'].includes(confirmation);
}
