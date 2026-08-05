import { Schema } from 'effect';

export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()('DatabaseError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class RedisError extends Schema.TaggedErrorClass<RedisError>()('RedisError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class CacheError extends Schema.TaggedErrorClass<CacheError>()('CacheError', {
  operation: Schema.String,
  key: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class StorageError extends Schema.TaggedErrorClass<StorageError>()('StorageError', {
  operation: Schema.String,
  key: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class AiProviderError extends Schema.TaggedErrorClass<AiProviderError>()('AiProviderError', {
  operation: Schema.String,
  provider: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class BatchError extends Schema.TaggedErrorClass<BatchError>()('BatchError', {
  operation: Schema.String,
  batchId: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class ImageProcessingError extends Schema.TaggedErrorClass<ImageProcessingError>()(
  'ImageProcessingError',
  {
    operation: Schema.String,
    cause: Schema.Unknown
  }
) {}

export class QueueError extends Schema.TaggedErrorClass<QueueError>()('QueueError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class NotificationError extends Schema.TaggedErrorClass<NotificationError>()(
  'NotificationError',
  {
    operation: Schema.String,
    cause: Schema.Unknown
  }
) {}

export class AuthError extends Schema.TaggedErrorClass<AuthError>()('AuthError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class ConfigError extends Schema.TaggedErrorClass<ConfigError>()('ConfigError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

export class ValidationError extends Schema.TaggedErrorClass<ValidationError>()('ValidationError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()('NotFoundError', {
  resource: Schema.String,
  message: Schema.String
}) {}

export class ConflictError extends Schema.TaggedErrorClass<ConflictError>()('ConflictError', {
  message: Schema.String
}) {}

export class BadRequestError extends Schema.TaggedErrorClass<BadRequestError>()('BadRequestError', {
  message: Schema.String
}) {}

export class UnauthorizedError extends Schema.TaggedErrorClass<UnauthorizedError>()(
  'UnauthorizedError',
  {
    message: Schema.optional(Schema.String)
  }
) {}

export class ForbiddenError extends Schema.TaggedErrorClass<ForbiddenError>()('ForbiddenError', {
  message: Schema.optional(Schema.String)
}) {}

/** All application tagged errors — single source for boundary recognition. */
export const KnownErrorSchema = Schema.Union([
  DatabaseError,
  RedisError,
  CacheError,
  StorageError,
  AiProviderError,
  BatchError,
  ImageProcessingError,
  QueueError,
  NotificationError,
  AuthError,
  ConfigError,
  ValidationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError
]);

export type KnownError = typeof KnownErrorSchema.Type;

export const isKnownError = Schema.is(KnownErrorSchema);
