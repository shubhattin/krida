import { Cause } from 'effect';
import { describe, expect, it } from 'vitest';
import { notFound } from '@tanstack/react-router';
import { TRPCError } from '@trpc/server';
import { BadRequestError, DatabaseError, NotFoundError, ValidationError } from '~/effect/errors';
import {
  buildExceptionCapture,
  clipText,
  exceptionFromCause,
  isPostHogEnabled,
  isSkippableThrown,
  markReported,
  shouldReportCause,
  wasReported
} from '~/lib/posthog-error';
import { posthogBrowserOptions } from '~/components/tags/PosthogInit';

describe('isPostHogEnabled', () => {
  it('stays off unless this is a production build with the project key and host', () => {
    expect(
      isPostHogEnabled({
        PROD: false,
        VITE_POSTHOG_KEY: 'phc_test',
        VITE_POSTHOG_URL: 'https://us.i.posthog.com'
      })
    ).toBe(false);
    expect(
      isPostHogEnabled({
        PROD: true,
        VITE_POSTHOG_KEY: '',
        VITE_POSTHOG_URL: 'https://us.i.posthog.com'
      })
    ).toBe(false);
    expect(
      isPostHogEnabled({
        PROD: true,
        VITE_POSTHOG_KEY: 'phc_test',
        VITE_POSTHOG_URL: 'https://us.i.posthog.com'
      })
    ).toBe(true);
  });
});

describe('posthogBrowserOptions', () => {
  it('masks inputs and traces only the page hostname', () => {
    const options = posthogBrowserOptions('padavali.example');
    expect(options.person_profiles).toBe('identified_only');
    expect(options.capture_exceptions).toBe(true);
    expect(options.tracing_headers).toEqual(['padavali.example']);
    expect(options.session_recording).toEqual({ maskAllInputs: true });
  });
});

describe('exceptionFromCause', () => {
  it('fills a blank DatabaseError message from the tag, operation, and nested cause', () => {
    const nested = new Error('connection reset');
    const cause = Cause.fail(DatabaseError.make({ operation: 'query', cause: nested }));
    const error = exceptionFromCause(cause);

    expect(error.message).toBe('DatabaseError query: connection reset');
    expect(error.cause).toBe(nested);
    expect(Cause.pretty(cause)).toContain('connection reset');
  });

  it('does not report expected domain 4xx errors or 404s', () => {
    expect(
      shouldReportCause(Cause.fail(NotFoundError.make({ resource: 'puzzle', message: 'missing' })))
    ).toBe(false);
    expect(shouldReportCause(Cause.fail(BadRequestError.make({ message: 'bad' })))).toBe(false);
    expect(shouldReportCause(Cause.fail(ValidationError.make({ message: 'invalid' })))).toBe(false);
    expect(
      shouldReportCause(Cause.fail(DatabaseError.make({ operation: 'query', cause: 'x' })))
    ).toBe(true);
    expect(shouldReportCause(Cause.die(new Error('boom')))).toBe(true);
  });

  it('attaches the session id and prefers the tracing distinct id', () => {
    const cause = Cause.fail(
      DatabaseError.make({ operation: 'query', cause: new Error('connection reset') })
    );
    const capture = buildExceptionCapture({
      cause,
      source: 'loader',
      status: 500,
      distinctIdHeader: 'ph-distinct',
      sessionIdHeader: 'ph-session',
      userId: 'user-1',
      method: 'GET',
      pathname: '/padavali/demo'
    });

    expect(capture.send).toBe(true);
    expect(capture.distinctId).toBe('ph-distinct');
    expect(capture.properties.$session_id).toBe('ph-session');
    expect(capture.properties.source).toBe('loader');
    expect(capture.properties.status).toBe(500);
    expect(capture.properties.method).toBe('GET');
    expect(capture.properties.pathname).toBe('/padavali/demo');
    expect(capture.properties.effect_tag).toBe('DatabaseError');
    expect(capture.properties.effect_cause).toContain('connection reset');
    expect(JSON.parse(String(capture.properties.effect_fields))).toEqual({
      operation: 'query',
      causeMessage: 'connection reset'
    });
    expect(capture.properties).not.toHaveProperty('cookie');
  });

  it('falls back to the authenticated user id and does not invent one', () => {
    const cause = Cause.die(new Error('boom'));
    const withUser = buildExceptionCapture({
      cause,
      source: 'server',
      distinctIdHeader: null,
      sessionIdHeader: null,
      userId: 'user-1'
    });
    const withoutUser = buildExceptionCapture({
      cause,
      source: 'server',
      distinctIdHeader: null,
      sessionIdHeader: 'ph-session'
    });

    expect(withUser.distinctId).toBe('user-1');
    expect(withoutUser.distinctId).toBeUndefined();
    expect(withoutUser.properties.$session_id).toBe('ph-session');
  });

  it('skips errors that were already sent', () => {
    const error = new Error('already');
    markReported(error);
    expect(wasReported(error)).toBe(true);
    expect(isSkippableThrown(error)).toBe(true);
    expect(isSkippableThrown(new TRPCError({ code: 'NOT_FOUND', message: 'missing' }))).toBe(true);

    let thrown: unknown;
    try {
      throw notFound();
    } catch (error) {
      thrown = error;
    }
    expect(isSkippableThrown(thrown)).toBe(true);
  });

  it('clips very long cause text', () => {
    expect(clipText('x'.repeat(20), 8)).toBe(`${'x'.repeat(8)}…`);
  });
});
