import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';
import { RedisClient } from '~/effect/redis';
import { RedisError } from '~/effect/errors';
import { canWriteSession } from './stats_session_adopt';

const PLAY_ID = '6f1c2b8e-3a4d-4e5f-8a9b-0c1d2e3f4a5b';

const fakeRedis = (store: Record<string, number>, failing = false) =>
  // SAFETY: canWriteSession only uses `get`; the rest of the service is never called
  ({
    get: (key: string) =>
      failing
        ? Effect.fail(RedisError.make({ operation: 'get', cause: new Error('down') }))
        : Effect.succeed(store[key] ?? null)
  }) as never;

const run = (
  session: { id: number; user_id: string | null },
  user: { id: string } | null,
  playId: string | undefined,
  store: Record<string, number> = {},
  failing = false
) =>
  Effect.runPromise(
    canWriteSession('padavali', session, user, playId).pipe(
      Effect.provideService(RedisClient, fakeRedis(store, failing))
    )
  );

describe('canWriteSession', () => {
  it('allows only the owner of a signed-in session', async () => {
    const session = { id: 42, user_id: 'alice' };
    expect(await run(session, { id: 'alice' }, undefined)).toBe(true);
    expect(await run(session, { id: 'mallory' }, PLAY_ID)).toBe(false);
    expect(await run(session, null, PLAY_ID)).toBe(false);
  });

  it('requires the creating play id for an anonymous session', async () => {
    const session = { id: 42, user_id: null };
    const store = { [`stats:play:padavali:${PLAY_ID}`]: 42 };
    expect(await run(session, null, PLAY_ID, store)).toBe(true);
    expect(await run(session, { id: 'bob' }, PLAY_ID, store)).toBe(true);
    expect(await run(session, { id: 'mallory' }, undefined, store)).toBe(false);
    expect(await run({ id: 43, user_id: null }, null, PLAY_ID, store)).toBe(false);
  });

  it('fails closed when Redis is unavailable', async () => {
    expect(await run({ id: 42, user_id: null }, null, PLAY_ID, {}, true)).toBe(false);
  });
});
