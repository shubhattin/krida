import * as fs from 'fs';
import { z } from 'zod';
import { execSync } from 'child_process';
import { import_data } from './import_data';
import * as dotenv from 'dotenv';
import { queryClient } from './client';

// Load environment variables from .env
dotenv.config({ path: '../../../.env' });

const OUT_FOLDER = './backup';

async function main() {
  if (!fs.existsSync(OUT_FOLDER)) fs.mkdirSync(OUT_FOLDER);

  const envs_parsed = z
    .object({
      PG_DATABASE_URL: z.string()
    })
    .safeParse(process.env);
  if (!envs_parsed.success) {
    console.error(envs_parsed.error);
    return;
  }
  const envs = envs_parsed.data;

  function backup(command: string, file_name: string, temp_file_name: string) {
    execSync(command);
    const backup_file_data = fs.readFileSync(temp_file_name).toString('utf-8');
    fs.writeFileSync(`${OUT_FOLDER}/${file_name}`, backup_file_data, {
      encoding: 'utf-8'
    });
    fs.rmSync(temp_file_name);
  }

  // Backup using pg_dump
  console.log('Backing up schema...');
  backup(
    `pg_dump --dbname=${envs.PG_DATABASE_URL} --if-exists --schema-only --clean --no-owner -f b.sql`,
    'db_dump_schema.sql',
    'b.sql'
  );
  console.log('Backing up data...');
  backup(
    `pg_dump --dbname=${envs.PG_DATABASE_URL} --data-only --insert --no-owner --rows-per-insert=8000 -f b.sql`,
    'db_dump_data.sql',
    'b.sql'
  );

  await import_data(false).then(() => {
    queryClient.end();
    fs.copyFileSync('./out/db_data.json', './backup/db_data.json');
  });

  console.log('Zipping backup files');
  execSync('zip backup.zip backup/db_dump_schema.sql backup/db_dump_data.sql backup/db_data.json');
  console.log('Backup complete');
}

main();
