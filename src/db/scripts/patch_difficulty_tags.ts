/**
 * One-off patch: give every puzzle in a difficulty collection (`difficulty-easy` …) its
 * matching difficulty tag (`easy` …). Previews the changes and asks before writing.
 *
 *   bun src/db/scripts/patch_difficulty_tags.ts           # local
 *   bun src/db/scripts/patch_difficulty_tags.ts --preview # preview db
 *   bun src/db/scripts/patch_difficulty_tags.ts --prod    # prod db
 */
import chalk from 'chalk';
import { inArray } from 'drizzle-orm';
import { dbClient_ext, queryClient } from './client';
import { dbMode, take_input } from '~/tools/kry.server';
import { addDifficultyTags, findMissingDifficultyTags } from '~/db/difficulty_tags';
import {
  DIFFICULTY_COLLECTION_SLUGS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_TAG_SLUGS
} from '~/util/catalog/difficulty';
import { collections, tags } from '~/db/schema';

const main = async () => {
  console.log(chalk.bold(`Difficulty tag patch — ${chalk.yellow(dbMode)} database\n`));

  const [existingTags, existingCollections, missing] = await Promise.all([
    dbClient_ext
      .select({ slug: tags.slug })
      .from(tags)
      .where(inArray(tags.slug, [...DIFFICULTY_TAG_SLUGS])),
    dbClient_ext
      .select({ slug: collections.slug })
      .from(collections)
      .where(inArray(collections.slug, [...DIFFICULTY_COLLECTION_SLUGS])),
    findMissingDifficultyTags(dbClient_ext)
  ]);

  const tagSet = new Set(existingTags.map((row) => row.slug));
  const collectionSet = new Set(existingCollections.map((row) => row.slug));
  for (const level of DIFFICULTY_LEVELS) {
    console.log(
      `${level.label.padEnd(7)} collection ${chalk.cyan(level.collection_slug)} ${
        collectionSet.has(level.collection_slug) ? chalk.green('found') : chalk.red('missing')
      }  ·  tag ${chalk.cyan(level.tag_slug)} ${
        tagSet.has(level.tag_slug) ? chalk.green('exists') : chalk.yellow('not created yet')
      }`
    );
  }
  console.log();

  if (missing.length === 0) {
    console.log(chalk.green('✓ Every puzzle in a difficulty collection already has its tag.'));
    return;
  }

  const newTags = [...new Set(missing.map((row) => row.tag_slug))].filter(
    (slug) => !tagSet.has(slug)
  );
  if (newTags.length > 0) {
    console.log(chalk.bold('Tags to create:'), chalk.yellow(newTags.join(', ')), '\n');
  }

  console.log(chalk.bold(`Tag links to add (${missing.length}):`));
  for (const level of DIFFICULTY_LEVELS) {
    const rows = missing.filter((row) => row.tag_slug === level.tag_slug);
    if (rows.length === 0) continue;
    console.log(chalk.cyan(`  + ${level.tag_slug} (${rows.length})`));
    for (const row of rows) {
      console.log(
        `      ${chalk.dim(`#${row.puzzle_id}`)} ${chalk.magenta(row.kind)} ${row.title} ${chalk.dim(row.slug)}`
      );
    }
  }
  console.log();

  const answer = await take_input(`Apply these changes to ${dbMode}? (yes/no) `);
  if (!['yes', 'y'].includes(answer.trim().toLowerCase())) {
    console.log(chalk.yellow('Aborted, nothing changed.'));
    return;
  }

  // Re-check inside the transaction so a concurrent edit is not double-counted.
  const applied = await dbClient_ext.transaction(async (tx) => {
    const current = await findMissingDifficultyTags(tx);
    await addDifficultyTags(tx, current);
    return current.length;
  });
  console.log(chalk.green(`✓ Added ${applied} difficulty tag link${applied === 1 ? '' : 's'}.`));
  console.log(
    chalk.yellow('! Public puzzle lists are cached; they pick up the new tags on next refresh.')
  );
};

main()
  .catch((error) => {
    console.error(chalk.red('✗ Patch failed:'), error);
    process.exitCode = 1;
  })
  .finally(() => {
    void queryClient.end();
  });
