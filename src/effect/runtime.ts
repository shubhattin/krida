/**
 * Composition root for Effect.
 *
 * One ManagedRuntime per Worker request (AsyncLocalStorage via src/server.ts).
 * Do not keep a process-wide runtime: Effect fibers/latches are isolate-global
 * and workerd drops continuations that settle in a different request.
 * waitUntil cache writes capture Redis/Database services, not this runtime.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { Layer, ManagedRuntime } from 'effect';
import { AppConfig } from './config';
import { Database } from './database';
import { RedisClient } from './redis';
import { ObjectStorage } from './storage';
import { AiProvider, OpenAiBatchClient } from './ai';
import { ImageProcessorLive } from './live/cf_images';
import { BackgroundWorkLive } from './live/background';
import { QStashPublisher } from './qstash';
import { NotificationService } from './notifications';
import { isCloudflareWorker } from './platform';

const InfrastructureLayer = Layer.mergeAll(ImageProcessorLive, BackgroundWorkLive);

const ConfigDependentLayer = Layer.mergeAll(
  Database.WorkersLive,
  RedisClient.Live,
  ObjectStorage.Live,
  AiProvider.Live,
  OpenAiBatchClient.Live,
  QStashPublisher.Live,
  NotificationService.Live
).pipe(Layer.provide(AppConfig.Live));

export const AppLayer = Layer.mergeAll(InfrastructureLayer, ConfigDependentLayer, AppConfig.Live);

export const makeAppRuntime = () => ManagedRuntime.make(AppLayer);

export type AppRuntime = ReturnType<typeof makeAppRuntime>;

type AppScope = { runtime: AppRuntime };

const requestScope = new AsyncLocalStorage<AppScope>();

const createScope = (): AppScope => ({ runtime: makeAppRuntime() });

/** Bind one Effect runtime to the current Worker request. */
export const runWithRequestRuntime = <T>(fn: () => Promise<T>): Promise<T> =>
  requestScope.run(createScope(), fn);

let fallbackScope: AppScope | undefined;

const getCached = (): AppScope => {
  const store = requestScope.getStore();
  if (store) return store;
  // workerd: never retain a runtime across requests if ALS was missed.
  if (isCloudflareWorker()) return createScope();
  return (fallbackScope ??= createScope());
};

export const getAppRuntime = (): AppRuntime => getCached().runtime;

export const disposeFallbackRuntime = async (): Promise<void> => {
  if (!fallbackScope) return;
  await fallbackScope.runtime.dispose();
  fallbackScope = undefined;
};
