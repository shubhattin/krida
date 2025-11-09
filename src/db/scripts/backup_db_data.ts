import * as fs from 'fs';
import { z } from 'zod';
import { execSync } from 'child_process';
import { import_data } from './import_data';
import * as dotenv from 'dotenv';
import { queryClient } from './client';
import {
  S3Client,
  PutObjectCommand,
  StorageClass,
  DeleteObjectsCommand,
  type PutObjectCommandInput,
  type _Object,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
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

  const uploadParams: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: mime.lookup(filePath) || 'application/octet-stream',
    StorageClass: StorageClass.GLACIER_IR
  };

  try {
    const data = await s3.send(new PutObjectCommand(uploadParams));
    console.log('Upload success');
  } catch (err) {
    console.error('Error uploading file:', err);
  }
}

async function cleanupOldBackups(
  bucketName: string,
  prefix: string,
  maxAgeMs: number,
  minBackupsToKeep: number
) {
  console.log('\n--- Starting backup cleanup ---');

  try {
    // 1. List all backup files
    const allObjects: _Object[] = [];
    let continuationToken: string | undefined;

    do {
      const listResponse = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken
        })
      );

      if (listResponse.Contents) {
        allObjects.push(...listResponse.Contents);
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    console.log(`Found ${allObjects.length} total backups`);

    // 2. Check if we have minimum backups
    if (allObjects.length <= minBackupsToKeep) {
      console.log(
        `Only ${allObjects.length} backups exist. Minimum is ${minBackupsToKeep}. Skipping cleanup.`
      );
      return;
    }

    // 3. Sort by date (oldest first)
    const sortedObjects = allObjects
      .filter((obj) => obj.Key && obj.LastModified)
      .sort((a, b) => a.LastModified!.getTime() - b.LastModified!.getTime());

    // 4. Find objects older than cutoff date
    const cutoffDate = new Date(Date.now() - maxAgeMs);
    const oldObjects = sortedObjects.filter((obj) => obj.LastModified! < cutoffDate);

    console.log(
      `Found ${oldObjects.length} backups older than ${new Date(cutoffDate).toISOString()}`
    );

    if (oldObjects.length === 0) {
      console.log('No old backups to delete');
      return;
    }

    // 5. Determine how many we can safely delete
    const totalBackups = sortedObjects.length;
    const maxDeletable = totalBackups - minBackupsToKeep;

    if (maxDeletable <= 0) {
      console.log(`Cannot delete any backups. Would leave fewer than ${minBackupsToKeep} backups.`);
      return;
    }

    // Only delete as many old backups as we can while maintaining minimum
    const objectsToDelete = oldObjects.slice(0, maxDeletable);

    if (objectsToDelete.length === 0) {
      console.log('No backups eligible for deletion after applying constraints');
      return;
    }

    console.log(
      `Will delete ${objectsToDelete.length} old backups (keeping ${totalBackups - objectsToDelete.length} backups)`
    );

    // 6. Delete in batches of 1000 (S3 limit)
    const keysToDelete = objectsToDelete.map((obj) => ({ Key: obj.Key! }));

    for (let i = 0; i < keysToDelete.length; i += 1000) {
      const batch = keysToDelete.slice(i, i + 1000);
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: batch, Quiet: false }
        })
      );
      console.log(`Deleted batch of ${batch.length} backups`);
    }

    console.log(`✓ Successfully deleted ${objectsToDelete.length} old backups`);
    console.log(`✓ Remaining backups: ${totalBackups - objectsToDelete.length}`);
  } catch (err) {
    console.error('Error during cleanup:', err);
    throw err;
  }
}

const BACKUP_FOLDER_NAME = 'padavali_backups';

async function main() {
  await backup_data();
  const current_date_key = new Date().toISOString();
  console.log(current_date_key);
  await uploadFile(
    envs.AWS_DB_BACKUP_BUCKET_NAME,
    `${BACKUP_FOLDER_NAME}/${current_date_key}.zip`,
    './backup/backup.zip'
  );

  const MIN_BACKUPS_TO_KEEP = 5;
  await cleanupOldBackups(
    envs.AWS_DB_BACKUP_BUCKET_NAME,
    BACKUP_FOLDER_NAME + '/',
    ms('45days'),
    MIN_BACKUPS_TO_KEEP
  );
}

main();
