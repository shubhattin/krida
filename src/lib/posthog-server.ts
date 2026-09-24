import { Cause } from 'effect';
import type { PostHog } from 'posthog-node';
import { getServerUserSession$ } from '~/lib/get_auth_from_cookie';
import {
  buildExceptionCapture,
  isPostHogEnabled,
  isSkippableThrown,
  markReported,
  wasReported
} from '~/lib/posthog-error';
import { currentRequest, currentRequestUserId, setRequestUserId } from '~/lib/request-context';

let client: PostHog | null | undefined;

function posthogHost(): string {
  return import.meta.env.VITE_POSTHOG_URL;
}

/** One server client, created on first use in production when the key is set. */
async function getPostHogClient(): Promise<PostHog | null> {
  if (client !== undefined) return client;
  if (!isPostHogEnabled(import.meta.env)) {
    client = null;
    return null;
  }

  const { PostHog } = await import('posthog-node');
  client = new PostHog(import.meta.env.VITE_POSTHOG_KEY, {
    host: posthogHost(),
    flushAt: 1,
    flushInterval: 0
  });
  return client;
}

async function lookupAuthenticatedUserId(): Promise<string | undefined> {
  const stored = currentRequestUserId();
  if (stored) return stored;

  try {
    const session = await getServerUserSession$();
    const userId = session?.user.id;
    if (userId) {
      setRequestUserId(userId);
      return userId;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function requestContext(request: Request | undefined) {
  return {
    distinctIdHeader: request?.headers.get('x-posthog-distinct-id') ?? null,
    sessionIdHeader: request?.headers.get('x-posthog-session-id') ?? null,
    method: request?.method,
    pathname: request ? new URL(request.url).pathname : undefined
  };
}

/**
 * Capture a server Effect failure. Does not shut the client down.
 * Returns the error that should be rethrown when the boundary throws.
 */
export async function captureEffectFailure(
  cause: Cause.Cause<unknown>,
  options: { source: string; status?: number; request?: Request }
): Promise<Error> {
  const request = options.request ?? currentRequest();
  const context = requestContext(request);
  const enabled = isPostHogEnabled(import.meta.env);
  const userId =
    enabled && !context.distinctIdHeader?.trim()
      ? await lookupAuthenticatedUserId()
      : currentRequestUserId();
  const capture = buildExceptionCapture({
    cause,
    source: options.source,
    status: options.status,
    userId,
    ...context
  });

  if (!enabled || !capture.send || wasReported(capture.error)) {
    return capture.error;
  }

  markReported(capture.error);
  const posthog = await getPostHogClient();
  if (!posthog) return capture.error;

  try {
    await posthog.captureExceptionImmediate(capture.error, capture.distinctId, capture.properties);
  } catch (error) {
    console.error('[posthog] failed to capture exception', error);
  }
  return capture.error;
}

/** Report a thrown server error that did not already go through an Effect runner. */
export async function captureThrownError(cause: unknown, source: string): Promise<void> {
  if (isSkippableThrown(cause)) return;
  if (Cause.isCause(cause)) {
    await captureEffectFailure(cause, { source });
    return;
  }
  const captured = await captureEffectFailure(Cause.fail(cause), { source });
  if (cause instanceof Error) markReported(cause);
  markReported(captured);
}
