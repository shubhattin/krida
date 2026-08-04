import { Cause, Effect, Exit } from 'effect';
import { TRPCError } from '@trpc/server';
import { appRuntime } from './runtime';
import { isKnownError, type KnownError } from './errors';

/** Domain / config errors with distinct tRPC codes; infra errors share the default. */
const TRPC_CODE_BY_TAG: Partial<Record<KnownError['_tag'], TRPCError['code']>> = {
  NotFoundError: 'NOT_FOUND',
  BadRequestError: 'BAD_REQUEST',
  ValidationError: 'BAD_REQUEST',
  ConflictError: 'CONFLICT',
  UnauthorizedError: 'UNAUTHORIZED',
  ForbiddenError: 'FORBIDDEN',
  ConfigError: 'INTERNAL_SERVER_ERROR'
};

const toTrpcMessage = (error: KnownError): string => {
  switch (error._tag) {
    case 'NotFoundError':
    case 'BadRequestError':
    case 'ValidationError':
    case 'ConflictError':
    case 'ConfigError':
      return error.message;
    case 'UnauthorizedError':
      return error.message ?? 'Unauthorized';
    case 'ForbiddenError':
      return error.message ?? 'Forbidden';
    default:
      return 'Unexpected server error';
  }
};

const toTrpcError = (error: KnownError): TRPCError =>
  new TRPCError({
    code: TRPC_CODE_BY_TAG[error._tag] ?? 'INTERNAL_SERVER_ERROR',
    message: toTrpcMessage(error),
    cause: error
  });

const httpStatusForError = (error: KnownError): number => {
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
};

/**
 * Run an Effect at the tRPC boundary. This is the only place routers should
 * call into the Effect runtime.
 */
export const runTrpcEffect = async <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> => {
  const exit = await appRuntime.runPromiseExit(
    effect.pipe(Effect.annotateLogs({ boundary: 'trpc' })) as Effect.Effect<A, E>
  );

  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.findErrorOption(exit.cause);
  if (failure._tag === 'Some' && isKnownError(failure.value)) {
    throw toTrpcError(failure.value);
  }

  console.error('[trpc] unexpected effect defect', Cause.pretty(exit.cause));
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error',
    cause: exit.cause
  });
};

/**
 * Run an Effect at RSC / server-action / loader boundaries.
 */
export const runServerEffect = <A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> =>
  appRuntime.runPromise(
    effect.pipe(Effect.annotateLogs({ boundary: 'server' })) as Effect.Effect<A, E>
  );

/**
 * Run an Effect at a Next.js route-handler boundary and map known errors to Response.
 */
export const runRouteEffect = async <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: {
    onSuccess?: (value: A) => Response;
  }
): Promise<Response> => {
  const exit = await appRuntime.runPromiseExit(
    effect.pipe(Effect.annotateLogs({ boundary: 'route' })) as Effect.Effect<A, E>
  );

  if (Exit.isSuccess(exit)) {
    return options?.onSuccess?.(exit.value) ?? Response.json(exit.value);
  }

  const failure = Cause.findErrorOption(exit.cause);
  if (failure._tag === 'Some' && isKnownError(failure.value)) {
    const status = httpStatusForError(failure.value);
    return Response.json(
      { error: toTrpcMessage(failure.value), tag: failure.value._tag },
      { status }
    );
  }

  console.error('[route] unexpected effect defect', Cause.pretty(exit.cause));
  return Response.json({ error: 'Unexpected server error' }, { status: 500 });
};

/**
 * Run an Effect at a QStash consumer boundary.
 * Returns HTTP Response with status codes that control QStash retry behaviour.
 */
export const runQstashEffect = async <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options?: {
    onSuccess?: (value: A) => Response;
  }
): Promise<Response> => {
  const exit = await appRuntime.runPromiseExit(
    effect.pipe(Effect.annotateLogs({ boundary: 'qstash' })) as Effect.Effect<A, E>
  );

  if (Exit.isSuccess(exit)) {
    return options?.onSuccess?.(exit.value) ?? new Response('OK', { status: 200 });
  }

  const failure = Cause.findErrorOption(exit.cause);
  if (failure._tag === 'Some' && isKnownError(failure.value)) {
    const status = httpStatusForError(failure.value);
    // 4xx tells QStash not to retry forever on permanent failures
    return Response.json(
      { error: toTrpcMessage(failure.value), tag: failure.value._tag },
      { status }
    );
  }

  console.error('[qstash] unexpected effect defect', Cause.pretty(exit.cause));
  // 500 lets QStash retry transient defects
  return Response.json({ error: 'Unexpected server error' }, { status: 500 });
};

export const runTrpcEffectResult = runTrpcEffect;
