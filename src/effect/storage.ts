import { Context, Effect, Layer, Redacted } from 'effect';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  StorageClass,
  type PutObjectCommandInput
} from '@aws-sdk/client-s3';
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

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  let length = 0;
  for (const chunk of chunks) length += chunk.byteLength;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
};

type S3ResponseChunk = Uint8Array | ArrayBuffer | ArrayBufferView;

type S3ResponseBody =
  | Uint8Array
  | Blob
  | ReadableStream<Uint8Array>
  | AsyncIterable<S3ResponseChunk>
  | null
  | undefined;

const isReadableStream = (stream: S3ResponseBody): stream is ReadableStream<Uint8Array> =>
  stream != null && 'getReader' in stream;

const isAsyncIterable = (stream: S3ResponseBody): stream is AsyncIterable<S3ResponseChunk> =>
  stream != null && Symbol.asyncIterator in stream;

/**
 * workerd + `nodejs_compat` gives a Node Readable as `fetch` `Response.body`.
 * The AWS browser runtime always calls `stream.getReader()`, which that body
 * does not have — after PutObject already returned HTTP 200.
 */
const collectS3ResponseBody = async (stream: S3ResponseBody): Promise<Uint8Array> => {
  if (stream == null) return new Uint8Array();
  if (stream instanceof Uint8Array) return stream;
  if (stream instanceof Blob) {
    return new Uint8Array(await stream.arrayBuffer());
  }
  if (isReadableStream(stream)) {
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  if (isAsyncIterable(stream)) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
      } else if (chunk instanceof ArrayBuffer) {
        chunks.push(new Uint8Array(chunk));
      } else if (ArrayBuffer.isView(chunk)) {
        chunks.push(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      }
    }
    return concatBytes(chunks);
  }
  return new Uint8Array();
};

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
          },
          // AWS SDK 3.729+ defaults checksums to WHEN_SUPPORTED (Node/wasm CRC32).
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
          streamCollector: collectS3ResponseBody
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
              Body: Uint8Array.from(fileBuffer),
              ContentType: 'image/webp',
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
