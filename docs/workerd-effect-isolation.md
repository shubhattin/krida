# Isolated resources on workerd (Effect)

Cloudflare does **not** give each request its own JavaScript heap. One Worker isolate handles many concurrent requests. What it *does* isolate is **I/O**: a TCP socket, WebSocket, or stream created during request A must not be used from request B.

That rule is a property of **workerd**, not of production. `bun run dev` with a Cloudflare adapter (Astro, SvelteKit, TanStack Start) also runs in workerd (Miniflare). A Node-style singleton Postgres pool will fail locally the same way it fails after deploy. Effect scoping exists so our resources follow the same request boundary the runtime already enforces for sockets.

This note is framework-agnostic. The first landing is the Astro site; the same Effect shapes apply to SvelteKit and TanStack Start.

Illustrative snippets live in [`examples/workerd-effect-isolation/`](./examples/workerd-effect-isolation/).

---

## What workerd isolates vs what it does not

| Isolated by workerd (IoContext) | Shared across the isolate (your problem) |
| --- | --- |
| TCP (`postgres.js`), WebSocket (Neon `Pool`) | `let pool` / `ManagedRuntime` at module scope |
| Streams, request-created Promises | Effect’s default fiber scheduler |
| Bindings handed to *this* `fetch` (`env`, `ctx`) | `Effect.cached`, in-flight `Map`s, module caches of **Effects** |

If request B uses a socket opened in request A, workerd throws (*I/O on behalf of a different request*) or hangs (*Worker’s code had hung*). If an Effect Latch created in A is opened from B after A has ended, continuations are dropped — same hang, stack in `Latch.flushWaiters`.

HTTP `fetch` (Upstash REST, most APIs) is not a sticky socket. Reusing those clients is fine. Plain JSON in a module-level cache is fine. A **running fiber** or **open connection** is not.

---

## Two Effect scopes

### 1. Request scope — one `ManagedRuntime` per incoming `fetch`

Do not keep a process-wide runtime. Build the Layer stack once per request and store it in `AsyncLocalStorage` (or the framework’s `locals` / `event.platform`, same idea). Every `runPromise` on that page shares it; the next request gets a new one.

See [`request-runtime.ts`](./examples/workerd-effect-isolation/request-runtime.ts).

Wire it at the **server entry** of whatever framework you use (middleware / `hooks.server` / Start request hook). Domain code should only call `runServerEffect` — it must not know Astro vs SvelteKit.

```ts
// One line at the edge. Domain Effects stay unaware of the framework.
export const onRequest = (event, next) => runWithRequestRuntime(() => next());
```

### 2. Resource scope — do not hold Worker-unsafe I/O on the Layer

A `Layer.effect(Database)` that `acquireRelease`s one `postgres()` for the life of the runtime is correct on **Node** (admin today). On workerd that client dies with the request that created it.

For Workers, the Live implementation opens a client **for the query** (or for the request Scope if you dispose the runtime at the end) and closes it in `finally`. Same `Database` service tag; different Live.

See [`database.ts`](./examples/workerd-effect-isolation/database.ts).

```text
fetch
  → request runtime (ALS)
      → dbRun / cache.get
          → Workers Live: open → query → close
  → response
  → sockets already closed; runtime dropped
```

Admin-style interactive sessions (`pg_advisory_xact_lock`, long transactions) stay on the Node Live. Public SSR reads use the Workers Live.

---

## Fibers you must not share

`Effect.cached` and “in-flight” maps store a **deferred fiber**, not data. The Promise inside is pinned to the request that started it. Request 2 `yield*` that Effect → hang.

On workerd:

- Cache **plain values** in module scope if you want (project list JSON, TTLs).
- Do **not** join `inFlight` Effects across requests.
- Skip fake `Effect.sleep` delays used to mimic Redis in Node; the timer Latch crosses IoContexts.

Detect workerd with the official UA check ([`platform.ts`](./examples/workerd-effect-isolation/platform.ts)):

```ts
globalThis.navigator?.userAgent === 'Cloudflare-Workers'
```

Node / Vitest → share in-flight fibers as today. workerd → fetch independently, then store the **result**.

---

## Background work (`waitUntil`)

Do not fire a naked Promise after the response. Use the platform `waitUntil` (Cloudflare: `import { waitUntil } from 'cloudflare:workers'`).

The thunk should `Effect.runPromise` with **captured services** (`provideService(RedisClient, redis)`, same for `Database`), not the request `ManagedRuntime`. The runtime may already be gone; the HTTP Redis client and a *new* per-query DB client are still valid if `waitUntil` kept the IoContext alive.

API (`BackgroundWork`) stays in shared code. Each app provides its own Live (Vercel vs Cloudflare).

---

## Effect’s scheduler vs workerd Promises

Effect’s fiber runtime is isolate-global. Latches resolve from whichever request is currently running. Since compatibility date `2024-10-14`, workerd **drops** those continuations if the creating request has ended (`handle_cross_request_promise_resolution`).

Workers that run Effect need:

```toml
compatibility_flags = ["nodejs_compat", "no_handle_cross_request_promise_resolution"]
```

That flag does not replace scoping. It lets the scheduler finish. You still must not reuse sockets or `Effect.cached` fibers.

---

## Checklist when moving another app onto Workers

1. Split **API** (`Context.Service`) from **Live**. Node Live can keep a pool. Add `WorkersLive` (or equivalent) that never retains TCP/WebSocket.
2. One `ManagedRuntime` per `fetch`, entered at the framework edge.
3. Gate `Effect.cached` / in-flight maps with `canShareInFlightFibers()`.
4. `waitUntil` + captured services; no module-level `ctx`.
5. Set `no_handle_cross_request_promise_resolution` next to `nodejs_compat`.
6. Prove it in `bun run dev` (workerd), not only after deploy.

In this repo the Astro site already follows this (`site/src/effect/site_runtime.ts`, `Database.WorkersLive`, `app/src/effect/platform.ts`). SvelteKit admin and TanStack Start apps should copy the Effect patterns, not the Astro files.
