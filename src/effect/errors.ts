import { Schema } from 'effect';

export class DatabaseError extends Schema.TaggedError<DatabaseError>()('DatabaseError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class RedisError extends Schema.TaggedError<RedisError>()('RedisError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class CacheError extends Schema.TaggedError<CacheError>()('CacheError', {
  operation: Schema.String,
  key: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class StorageError extends Schema.TaggedError<StorageError>()('StorageError', {
  operation: Schema.String,
  key: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class AiProviderError extends Schema.TaggedError<AiProviderError>()('AiProviderError', {
  operation: Schema.String,
  provider: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class BatchError extends Schema.TaggedError<BatchError>()('BatchError', {
  operation: Schema.String,
  batchId: Schema.optional(Schema.String),
  cause: Schema.Unknown
}) {}

export class ImageProcessingError extends Schema.TaggedError<ImageProcessingError>()(
  'ImageProcessingError',
  {
    operation: Schema.String,
    cause: Schema.Unknown
  }
) {}

export class QueueError extends Schema.TaggedError<QueueError>()('QueueError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class NotificationError extends Schema.TaggedError<NotificationError>()(
  'NotificationError',
  {
    operation: Schema.String,
    cause: Schema.Unknown
  }
) {}

export class AuthError extends Schema.TaggedError<AuthError>()('AuthError', {
  operation: Schema.String,
  cause: Schema.Unknown
}) {}

export class ConfigError extends Schema.TaggedError<ConfigError>()('ConfigError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

export class ValidationError extends Schema.TaggedError<ValidationError>()('ValidationError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
}) {}

export class NotFoundError extends Schema.TaggedError<NotFoundError>()('NotFoundError', {
  resource: Schema.String,
  message: Schema.String
}) {}

export class ConflictError extends Schema.TaggedError<ConflictError>()('ConflictError', {
  message: Schema.String
}) {}

export class BadRequestError extends Schema.TaggedError<BadRequestError>()('BadRequestError', {
  message: Schema.String
}) {}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  {
    message: Schema.optional(Schema.String)
  }
) {}

export class ForbiddenError extends Schema.TaggedError<ForbiddenError>()('ForbiddenError', {
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
