import { Context, Effect, Layer, Redacted } from 'effect';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  StorageClass,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';
import mime from 'mime-types';
import { KRIDAS, PROJECT_S3_ALIAS } from '~/constants';
import { AppConfig } from './config';
import { StorageError } from './errors';

export type AssetLocation =
  `${typeof PROJECT_S3_ALIAS}/${(typeof KRIDAS)[number]}/image_assets/${string}.webp`;

const ASSET_KEY_PATTERN = new RegExp(
  `^${PROJECT_S3_ALIAS}/(?:${KRIDAS.join('|')})/image_assets/[\\w.-]+\\.webp$`
);

const tryStorage = <A>(operation: string, key: string | undefined, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => StorageError.make({ operation, key, cause })
  }).pipe(Effect.annotateLogs({ category: 'storage', operation, key }));

export class ObjectStorage extends Context.Service<
  ObjectStorage,
  {
    readonly uploadAssetFile: (
      key: AssetLocation,
      fileBuffer: Buffer
    ) => Effect.Effect<unknown, StorageError>;
    readonly deleteAssetFile: (key: string) => Effect.Effect<unknown, StorageError>;
  }
>()('ObjectStorage') {
  static readonly Live = Layer.effect(ObjectStorage)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const bucket = config.awsS3BucketName;
      // Construct on first upload/delete. `new S3Client()` loads the Node AWS
      // runtime (`runtimeConfig.js`), whose named imports break under workerd's
      // Vite module runner — and cache loaders do not need S3.
      let s3: S3Client | undefined;
      const getS3 = () =>
        (s3 ??= new S3Client({
          region: config.awsRegion,
          credentials: {
            accessKeyId: config.awsAccessKeyId,
            secretAccessKey: Redacted.value(config.awsSecretAccessKey)
          }
        }));

      return {
        uploadAssetFile: (key, fileBuffer) =>
          tryStorage('uploadAssetFile', key, async () => {
            if (!ASSET_KEY_PATTERN.test(key)) {
              throw new Error(`Invalid asset key: ${key}`);
            }
            const uploadParams: PutObjectCommandInput = {
              Bucket: bucket,
              Key: key,
              Body: fileBuffer,
              ContentType: mime.lookup(key) || 'application/octet-stream',
              StorageClass: StorageClass.STANDARD
            };
            return getS3().send(new PutObjectCommand(uploadParams));
          }),
        deleteAssetFile: (key) =>
          tryStorage('deleteAssetFile', key, async () => {
            if (!ASSET_KEY_PATTERN.test(key)) {
              throw new Error(`Invalid asset key: ${key}`);
            }
            return getS3().send(
              new DeleteObjectCommand({
                Bucket: bucket,
                Key: key
              })
            );
          })
      };
    })
  );
}
