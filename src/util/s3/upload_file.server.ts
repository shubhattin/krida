import { z } from 'zod';
import mime from 'mime-types';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { DeleteObjectCommand, PutObjectCommand, S3Client, StorageClass } from '@aws-sdk/client-s3';
import { KRIDAS, PROJECT_S3_ALIAS } from '~/constants';

const envs_parsed = z
  .object({
    AWS_REGION: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_S3_FILES_BUCKET_NAME: z.string().min(1)
  })
  .safeParse(process.env);
if (!envs_parsed.success) {
  console.error(envs_parsed.error);
  throw new Error('Invalid environment variables');
}
const envs = envs_parsed.data;

const s3 = new S3Client({
  region: envs.AWS_REGION,
  credentials: {
    accessKeyId: envs.AWS_ACCESS_KEY_ID,
    secretAccessKey: envs.AWS_SECRET_ACCESS_KEY
  }
});

async function uploadFile(bucketName: string, key: string, fileBuffer: Buffer) {
  const uploadParams: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mime.lookup(key) || 'application/octet-stream',
    StorageClass: StorageClass.STANDARD
  };

  const data = await s3.send(new PutObjectCommand(uploadParams));
  return data;
}

const ASSET_BUCKET_NAME = envs.AWS_S3_FILES_BUCKET_NAME;

type location_types =
  `${typeof PROJECT_S3_ALIAS}/${(typeof KRIDAS)[number]}/image_assets/${string}.webp`;
export const uploadAssetFile = async (key: location_types, fileBuffer: Buffer) => {
  const data = await uploadFile(ASSET_BUCKET_NAME, key, fileBuffer);
  return data;
};

const ASSET_KEY_PATTERN = new RegExp(
  `^${PROJECT_S3_ALIAS}/(?:${KRIDAS.join('|')})/image_assets/[\\w.-]+\\.webp$`
);

export const deleteAssetFile = async (key: string) => {
  if (!ASSET_KEY_PATTERN.test(key)) {
    throw new Error(`Invalid asset key: ${key}`);
  }

  const data = await s3.send(
    new DeleteObjectCommand({
      Bucket: ASSET_BUCKET_NAME,
      Key: key
    })
  );
  return data;
};
