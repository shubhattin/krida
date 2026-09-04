/**
 * Illustrative request-scoped Effect runtime.
 * Wire `runWithRequestRuntime` at the framework edge (Astro middleware,
 * SvelteKit hooks.server, TanStack Start server middleware).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { Layer, ManagedRuntime } from 'effect';

// Replace with the app's Layer stack (Database, Redis, BackgroundWork, …).
declare const appLayer: Layer.Layer<never>;

type AppRuntime = ManagedRuntime.ManagedRuntime<never, never>;
type RequestScope = { runtime: AppRuntime };

const requestScope = new AsyncLocalStorage<RequestScope>();

const createScope = (): RequestScope => ({
  runtime: ManagedRuntime.make(appLayer)
});

export const runWithRequestRuntime = <T>(fn: () => Promise<T>): Promise<T> =>
  requestScope.run(createScope(), fn);

const getScope = (): RequestScope => requestScope.getStore() ?? createScope();

export const runServerEffect = <A, E>(effect: Parameters<AppRuntime['runPromise']>[0]) =>
  getScope().runtime.runPromise(effect);

/*
  Astro:     onRequest = (_ctx, next) => runWithRequestRuntime(() => next())
  SvelteKit: handle = ({ event, resolve }) => runWithRequestRuntime(() => resolve(event))
  TanStack:  wrap the server handler the same way — one run() per fetch.
*/
