import { Cause, Schema } from 'effect';
import { TRPCError } from '@trpc/server';
import { isNotFound } from '@tanstack/react-router';
import { isKnownError, type KnownError } from '~/effect/errors';

const CAUSE_TEXT_LIMIT = 8_000;

const EXPECTED_TAGS = new Set<KnownError['_tag']>([
  'NotFoundError',
  'BadRequestError',
  'ValidationError',
  'UnauthorizedError',
  'ForbiddenError',
  'ConflictError'
]);

const EXPECTED_TRPC_CODES = new Set<TRPCError['code']>([
  'NOT_FOUND',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'CONFLICT'
]);

const reported = Symbol.for('padavali.posthog.reported');

export type PostHogEnv = {
  readonly PROD: boolean;
  readonly DEV?: boolean;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_URL?: string;
};

/** Production build with the existing project key and api host. */
export function isPostHogEnabled(env: PostHogEnv): boolean {
  return Boolean(env.PROD && env.VITE_POSTHOG_KEY && env.VITE_POSTHOG_URL);
}

export function clipText(text: string, limit = CAUSE_TEXT_LIMIT): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

export function isExpectedKnownError(error: KnownError): boolean {
  return EXPECTED_TAGS.has(error._tag);
}

export function httpStatusForKnownError(error: KnownError): number {
  switch (error._tag) {
    case 'NotFoundError':
      return 404;
    case 'BadRequestError':
    case 'ValidationError':
      return 400;
    case 'ConflictError':
      return 409;
    case 'UnauthorizedError':
      return 401;
    case 'ForbiddenError':
      return 403;
    default:
      return 500;
  }
}

export function shouldReportCause(cause: Cause.Cause<unknown>): boolean {
  if (Cause.hasInterruptsOnly(cause)) return false;
  if (Cause.hasDies(cause)) return true;
  if (!Cause.hasFails(cause)) return false;

  for (const reason of cause.reasons) {
    if (!Cause.isFailReason(reason)) continue;
    if (!(isKnownError(reason.error) && isExpectedKnownError(reason.error))) {
      return true;
    }
  }
  return false;
}

const NestedCauseMessage = Schema.Union([Schema.String, Schema.Struct({ message: Schema.String })]);

function nonempty(message: string): string | undefined {
  return message.length > 0 ? message : undefined;
}

function nestedMessage(cause: unknown): string | undefined {
  if (cause instanceof Error) return nonempty(cause.message);
  const decoded = Schema.decodeUnknownExit(NestedCauseMessage)(cause);
  if (decoded._tag !== 'Success') return undefined;
  const value = decoded.value;
  if (Schema.is(Schema.String)(value)) return nonempty(value);
  return nonempty(value.message);
}

function nestedError(cause: unknown): Error | undefined {
  return cause instanceof Error ? cause : undefined;
}

function withNestedCause(base: string, cause: unknown): string {
  const nested = nestedMessage(cause);
  return nested ? `${base}: ${nested}` : base;
}

function describeOperationError(error: KnownError): string | undefined {
  switch (error._tag) {
    case 'DatabaseError':
    case 'RedisError':
    case 'ImageProcessingError':
    case 'QueueError':
    case 'NotificationError':
    case 'AuthError':
      return withNestedCause(`${error._tag} ${error.operation}`, error.cause);
    case 'CacheError':
    case 'StorageError':
      return withNestedCause(
        `${error._tag} ${error.operation}${error.key ? ` ${error.key}` : ''}`,
        error.cause
      );
    case 'AiProviderError':
      return withNestedCause(
        `${error._tag} ${error.operation}${error.provider ? ` ${error.provider}` : ''}`,
        error.cause
      );
    case 'BatchError':
      return withNestedCause(
        `${error._tag} ${error.operation}${error.batchId ? ` ${error.batchId}` : ''}`,
        error.cause
      );
    default:
      return undefined;
  }
}

/** Tag, operation, and nested cause message so PostHog does not show a blank exception. */
export function describeKnownError(error: KnownError): string {
  const operation = describeOperationError(error);
  if (operation) return operation;

  switch (error._tag) {
    case 'UnauthorizedError':
      return nonempty(error.message ?? '') ?? 'Unauthorized';
    case 'ForbiddenError':
      return nonempty(error.message ?? '') ?? 'Forbidden';
    case 'ConfigError':
    case 'ValidationError':
    case 'ConflictError':
    case 'BadRequestError':
    case 'NotFoundError':
      return nonempty(error.message) ?? error._tag;
    default:
      return error._tag;
  }
}

type EffectFields = {
  operation?: string;
  key?: string;
  provider?: string;
  batchId?: string;
  resource?: string;
  causeMessage?: string;
};

export function effectFields(error: KnownError): EffectFields {
  const fields: EffectFields = {};
  switch (error._tag) {
    case 'DatabaseError':
    case 'RedisError':
    case 'ImageProcessingError':
    case 'QueueError':
    case 'NotificationError':
    case 'AuthError':
      fields.operation = error.operation;
      assignCauseMessage(fields, error.cause);
      break;
    case 'CacheError':
    case 'StorageError':
      fields.operation = error.operation;
      if (error.key) fields.key = error.key;
      assignCauseMessage(fields, error.cause);
      break;
    case 'AiProviderError':
      fields.operation = error.operation;
      if (error.provider) fields.provider = error.provider;
      assignCauseMessage(fields, error.cause);
      break;
    case 'BatchError':
      fields.operation = error.operation;
      if (error.batchId) fields.batchId = error.batchId;
      assignCauseMessage(fields, error.cause);
      break;
    case 'NotFoundError':
      fields.resource = error.resource;
      break;
    case 'ConfigError':
    case 'ValidationError':
      if (error.cause !== undefined) assignCauseMessage(fields, error.cause);
      break;
    default:
      break;
  }
  return fields;
}

function assignCauseMessage(fields: EffectFields, cause: unknown) {
  const message = nestedMessage(cause);
  if (message) fields.causeMessage = clipText(message);
}

function knownFailure(cause: Cause.Cause<unknown>): KnownError | undefined {
  const failure = Cause.findErrorOption(cause);
  if (failure._tag === 'Some' && isKnownError(failure.value)) return failure.value;
  return undefined;
}

/**
 * Error built from `Cause.prettyErrors`, with a useful message and the nested cause kept.
 */
export function exceptionFromCause(cause: Cause.Cause<unknown>): Error {
  const [pretty] = Cause.prettyErrors(cause, { includeCauseInStack: true });
  const error = pretty ?? new Error('Unexpected server error');
  const known = knownFailure(cause);
  if (!known) return error;

  if (error.message.trim().length === 0) {
    error.message = describeKnownError(known);
    const stackLines = error.stack?.split('\n');
    if (stackLines && stackLines.length > 0) {
      stackLines[0] = `${error.name}: ${error.message}`;
      error.stack = stackLines.join('\n');
    }
  }
  if (error.name.length === 0) error.name = known._tag;

  if ('cause' in known) {
    const nested = nestedError(known.cause);
    if (nested) error.cause = nested;
  }
  return error;
}

export function statusForCause(cause: Cause.Cause<unknown>): number | undefined {
  const known = knownFailure(cause);
  if (known) return httpStatusForKnownError(known);
  if (Cause.hasDies(cause) || Cause.hasFails(cause)) return 500;
  return undefined;
}

export function markReported(error: Error): void {
  Object.defineProperty(error, reported, { value: true, enumerable: false });
}

export function wasReported(cause: unknown): boolean {
  if (!(cause instanceof Object)) return false;
  if (Object.hasOwn(cause, reported)) return true;
  if ('cause' in cause) return wasReported(cause.cause);
  return false;
}

function statusCode(cause: unknown): number | undefined {
  if (!(cause instanceof Object)) return undefined;
  if ('status' in cause) {
    const decoded = Schema.decodeUnknownExit(Schema.Number)(cause.status);
    if (decoded._tag === 'Success') return decoded.value;
  }
  if ('statusCode' in cause) {
    const decoded = Schema.decodeUnknownExit(Schema.Number)(cause.statusCode);
    if (decoded._tag === 'Success') return decoded.value;
  }
  return undefined;
}

/** 404s and expected domain 4xx errors are not defects. */
export function isSkippableThrown(cause: unknown): boolean {
  if (wasReported(cause)) return true;
  if (isNotFound(cause)) return true;
  if (statusCode(cause) === 404) return true;
  if (cause instanceof TRPCError && EXPECTED_TRPC_CODES.has(cause.code)) return true;
  if (isKnownError(cause) && isExpectedKnownError(cause)) return true;
  return false;
}

export type ExceptionProperties = {
  source: string;
  effect_cause: string;
  status?: number;
  method?: string;
  pathname?: string;
  $session_id?: string;
  effect_tag?: string;
  effect_fields?: string;
};

export type ExceptionCapture = {
  error: Error;
  send: boolean;
  distinctId?: string;
  properties: ExceptionProperties;
};

/**
 * Header distinct id wins. Authenticated user id is the fallback.
 * Missing both does not invent an identity.
 */
export function resolveDistinctId(
  distinctIdHeader: string | null,
  userId: string | undefined
): string | undefined {
  const header = distinctIdHeader?.trim();
  if (header) return header;
  if (userId && userId.length > 0) return userId;
  return undefined;
}

export function buildExceptionCapture(input: {
  cause: Cause.Cause<unknown>;
  source: string;
  status?: number;
  distinctIdHeader: string | null;
  sessionIdHeader: string | null;
  userId?: string;
  method?: string;
  pathname?: string;
}): ExceptionCapture {
  const error = exceptionFromCause(input.cause);
  const status = input.status ?? statusForCause(input.cause);
  const send = shouldReportCause(input.cause) && status !== 404 && !wasReported(error);
  const properties: ExceptionProperties = {
    source: input.source,
    effect_cause: clipText(Cause.pretty(input.cause))
  };
  if (status !== undefined) properties.status = status;
  if (input.method) properties.method = input.method;
  if (input.pathname) properties.pathname = input.pathname;

  const sessionId = input.sessionIdHeader?.trim();
  if (sessionId) properties.$session_id = sessionId;

  const known = knownFailure(input.cause);
  if (known) {
    properties.effect_tag = known._tag;
    properties.effect_fields = JSON.stringify(effectFields(known));
  }

  return {
    error,
    send,
    distinctId: resolveDistinctId(input.distinctIdHeader, input.userId),
    properties
  };
}
