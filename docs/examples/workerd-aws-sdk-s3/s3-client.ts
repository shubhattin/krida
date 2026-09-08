/**
 * Illustrative S3 client for workerd (`nodejs_compat`).
 * Node `S3Client()` defaults will throw at construct or after a successful PUT.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

/** Shapes a Smithy response body can take in workerd / Node. */
type S3ResponseBody = Uint8Array | Blob | ReadableStream<Uint8Array> | AsyncIterable<unknown>;

/** workerd fetch bodies are Node Readables; Smithy browser collector calls getReader(). */
const collectS3ResponseBody = async (
  stream: S3ResponseBody | null | undefined
): Promise<Uint8Array> => {
  if (stream == null) return new Uint8Array();
  if (stream instanceof Uint8Array) return stream;
  // globalThis access avoids a ReferenceError where the Blob global is absent.
  if (globalThis.Blob && stream instanceof Blob) {
    return new Uint8Array(await stream.arrayBuffer());
  }
  if (globalThis.ReadableStream && stream instanceof ReadableStream) {
    // SAFETY: instanceof ReadableStream narrows stream to a byte stream here.
    return new Uint8Array(await new Response(stream as ReadableStream<Uint8Array>).arrayBuffer());
  }
  const chunks: Uint8Array[] = [];
  // SAFETY: Uint8Array, Blob and ReadableStream bodies return above; whatever
  // reaches here is chunked (async-iterable) in every runtime we target.
  for await (const chunk of stream as AsyncIterable<unknown>) {
    if (chunk instanceof Uint8Array) chunks.push(chunk);
    else if (chunk instanceof ArrayBuffer) chunks.push(new Uint8Array(chunk));
    else if (ArrayBuffer.isView(chunk)) {
      chunks.push(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
    }
  }
  return concatBytes(chunks);
};

export const createWorkersS3Client = (input: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): S3Client =>
  new S3Client({
    region: input.region,
    credentials: {
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    streamCollector: collectS3ResponseBody
  });

export const putObjectBytes = (
  client: S3Client,
  input: { bucket: string; key: string; body: Uint8Array; contentType: string }
) =>
  client.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType
    })
  );
