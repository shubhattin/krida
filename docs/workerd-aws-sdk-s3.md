# AWS SDK v3 S3 on workerd

`@aws-sdk/client-s3` is a Node library. Cloudflare’s [R2 aws-sdk-js-v3 example](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/) is a **Node (or bun) process talking to R2**. It is not this setup.

This note is for running that same package **inside workerd** — `wrangler dev`, `@cloudflare/vite-plugin`, TanStack Start SSR — talking to **AWS S3** (or R2’s S3 API from a Worker). The SDK will construct, sign, and send the request. Then it can still throw. The object may already be in the bucket.

The first landing is the TanStack Start app (`padavali`). Same pitfalls apply to any Worker that `new S3Client()`.

Illustrative snippets live in [`examples/workerd-aws-sdk-s3/`](./examples/workerd-aws-sdk-s3/).

---

## Wrong docs, right docs

| What you read | What it actually is |
| --- | --- |
| [R2 + `@aws-sdk/client-s3`](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/) | Node client → R2 S3 API. Default Node `S3Client` is fine. |
| [R2 from Workers](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/) | `env.MY_BUCKET.put()` — no AWS SDK. |
| This app | workerd + Vite + `nodejs_compat` → **AWS S3** with access keys |

From a Worker, Cloudflare’s own upload examples use the **R2 binding** or [`aws4fetch`](https://developers.cloudflare.com/r2/objects/upload-objects/#presigned-urls-workers). They do not run Smithy’s Node HTTP handler or its browser `getReader()` collector.

A newer `@aws-sdk/client-s3` does not fix this. 3.1075 (current at time of writing) still has all three issues below.

---

## Three stacked failures

They show up in order. Fixing only the first one unmasks the second.

### 1. Node `runtimeConfig` in the Vite / workerd runner

`S3Client.js` does `import { getRuntimeConfig } from "./runtimeConfig"`. That file is the **Node** build:

- `awsCheckVersion(process.version)` (named import)
- `@aws-sdk/credential-provider-node`
- `@smithy/node-http-handler`

Under Vite’s workerd module runner those named imports break (`(0, __vite_ssr_import_1__.n) is not a function`). The crash happens at **`new S3Client()`**, not at `send()`.

If the Layer constructs the client when the runtime is built, **every SSR loader that needs Effect** dies — even routes that never upload. Construct on first `PutObject` / `DeleteObject`.

Then remap `./runtimeConfig` to `runtimeConfig.browser.js` (fetch handler) and **do not** let `ssr.optimizeDeps` pre-bundle `@aws-sdk/client-s3` (the prebundle bakes in Node `runtimeConfig` and skips the remap).

See [`vite-runtime-remap.ts`](./examples/workerd-aws-sdk-s3/vite-runtime-remap.ts).

### 2. PutObject 200, then `stream.getReader is not a function`

The browser runtime uses `@smithy/fetch-http-handler`. It stores `response.body` and later collects it with `stream.getReader()`.

`nodejs_compat` makes `fetch()` `Response.body` a **Node `Readable`**, not a WHATWG `ReadableStream`. There is no `getReader`.

Typical log:

```text
TypeError: stream.getReader is not a function
  Deserialization error: … {error}.$response
  metadata.httpStatusCode: 200
```

**The PUT succeeded.** Smithy failed while reading an empty response body. If you `catch` that and skip the DB insert, the UI looks like an upload failure and the object is already in the bucket (orphan key).

Pass a `streamCollector` that understands Node Readables (async iteration). See [`s3-client.ts`](./examples/workerd-aws-sdk-s3/s3-client.ts).

Always log `StorageError.cause`. Effect’s pretty logger prints class instances as `{}`.

### 3. Flexible checksums (SDK 3.729+)

Default is `requestChecksumCalculation: "WHEN_SUPPORTED"` — CRC32 via Node/wasm. That path is unreliable in workerd.

```ts
requestChecksumCalculation: 'WHEN_REQUIRED',
responseChecksumValidation: 'WHEN_REQUIRED',
```

R2 users hit this too; it is an AWS SDK default, not an S3-vs-R2 quirk. The R2 Node example does not set it because Node checksums work.

---

## Body type

Send a plain `Uint8Array`, not a Node `Buffer` subclass:

```ts
Body: Uint8Array.from(fileBuffer)
```

The fetch handler’s body-length / signing path is built for web bytes.

---

## What to use instead (when you can)

| Approach | When |
| --- | --- |
| **R2 binding** `env.BUCKET.put(key, bytes)` | Object is on R2 and the Worker owns the write |
| **`aws4fetch`** | You need signed HTTP to S3 or R2 from a Worker without Smithy |
| **`@aws-sdk/client-s3` + the remaps below** | Existing AWS S3 bucket, keys, CloudFront, SDK commands already in the app |

`padavali` is the third row: real S3 (`AKIA…`, regional bucket), not R2.

---

## Checklist

1. Do not `new S3Client()` in a Layer that SSR loaders always build. Lazy-init on first upload/delete.
2. Vite plugin: `S3Client`’s `./runtimeConfig` → `runtimeConfig.browser.js`.
3. `ssr.optimizeDeps.exclude: ['@aws-sdk/client-s3']`.
4. `streamCollector` that async-iterates Node Readables (and still handles `getReader()` / `Blob`).
5. `requestChecksumCalculation` / `responseChecksumValidation`: `'WHEN_REQUIRED'`.
6. `Body: Uint8Array.from(buffer)`.
7. Log the thrown `cause`. HTTP 200 + deserialize error means the object is already stored.

Prove it with `bun run dev` (workerd), not only after deploy. A successful `PutObject` that never writes a DB row is this bug, not Cloudflare Images.
