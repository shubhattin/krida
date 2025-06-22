import * as fs from 'fs';
import { z } from 'zod';
import { execSync } from 'child_process';
import { import_data } from './import_data';
import * as dotenv from 'dotenv';
import { queryClient } from './client';
import { S3Client, PutObjectCommand, StorageClass } from '@aws-sdk/client-s3';
import mime from 'mime-types';
import ms from 'ms';

// Load environment variables from .env
dotenv.config({ path: '../../../.env' });

const OUT_FOLDER = './backup';
const envs_parsed = z
  .object({
    PG_DATABASE_URL: z.string(),
    AWS_REGION: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    AWS_DB_BACKUP_BUCKET_NAME: z.string()
  })
  .safeParse(process.env);
if (!envs_parsed.success) {
  console.error(envs_parsed.error);
  throw new Error('Invalid environment variables');
}
const envs = envs_parsed.data;

async function backup_data() {
  if (!fs.existsSync(OUT_FOLDER)) fs.mkdirSync(OUT_FOLDER);

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
  execSync(
    'zip backup/backup.zip backup/db_dump_schema.sql backup/db_dump_data.sql backup/db_data.json'
  );
  console.log('Backup complete');
}

const s3 = new S3Client({
  region: envs.AWS_REGION,
  credentials: {
    accessKeyId: envs.AWS_ACCESS_KEY_ID,
    secretAccessKey: envs.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadFile(bucketName: string, key: string, filePath: string) {
  const fileStream = fs.createReadStream(filePath);

  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: mime.lookup(filePath) || 'application/octet-stream',
    StorageClass: StorageClass.GLACIER_IR,
    Expires: new Date(Date.now() + ms('70days'))
  };

  try {
    const data = await s3.send(new PutObjectCommand(uploadParams));
    console.log('Upload success');
  } catch (err) {
    console.error('Error uploading file:', err);
  }
}

const BACKUP_FOLDER_NAME = 'padavali_backups';

async function main() {
  await backup_data();
  const current_date_key = new Date().toISOString();
  await uploadFile(
    envs.AWS_DB_BACKUP_BUCKET_NAME,
    `${BACKUP_FOLDER_NAME}/${current_date_key}.zip`,
    './backup/backup.zip'
  );
}

main();
