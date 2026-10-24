import { Layer, ManagedRuntime } from 'effect';
import { AppConfig } from './config';
import { Database, DatabaseHttp } from './database';
import { RedisClient } from './redis';
import { ObjectStorage } from './storage';
import { AiProvider, OpenAiBatchClient } from './ai';
import { ImageProcessor } from './image';
import { BackgroundWork } from './background';
import { QStashPublisher } from './qstash';

const InfrastructureLayer = Layer.mergeAll(ImageProcessor.Live, BackgroundWork.Live);

const ConfigDependentLayer = Layer.mergeAll(
  // HTTP is stateless; WS/TCP pool still opens lazily on first session query
  DatabaseHttp.Live,
  Database.Live,
  RedisClient.Live,
  ObjectStorage.Live,
  AiProvider.Live,
  OpenAiBatchClient.Live,
  QStashPublisher.Live
).pipe(Layer.provide(AppConfig.Live));

// Layers are cached and executed lazily when needed
export const AppLayer = Layer.mergeAll(InfrastructureLayer, ConfigDependentLayer, AppConfig.Live);

export const appRuntime = ManagedRuntime.make(AppLayer);

// Dev only: a hot reload re-evaluates this module and builds a fresh runtime. Dispose the
// previous one so its Postgres clients close instead of leaking until "too many clients".
// Production evaluates this once per instance, so every request shares one runtime.
declare global {
  var __kridaAppRuntime: typeof appRuntime | undefined;
}

if (import.meta.env?.DEV) {
  const previous = globalThis.__kridaAppRuntime;
  globalThis.__kridaAppRuntime = appRuntime;
  if (previous && previous !== appRuntime) void previous.dispose();
}

export type AppRuntime = typeof appRuntime;
