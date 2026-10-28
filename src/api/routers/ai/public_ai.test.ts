import { describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';
import { TRPCError } from '@trpc/server';
import type { Context } from '~/api/context';
import { NotFoundError } from '~/effect/errors';

type Puzzle = { id: number; slug: string; listed: boolean };
type MockState = { puzzles: Map<string, Puzzle>; currentPuzzleId?: number; aiCalls: number[] };

const state = vi.hoisted((): MockState => ({ puzzles: new Map(), aiCalls: [] }));

// The router reads the CACHE singleton directly (no injection point), so the cache module is
// replaced with an in-memory stand-in exposing the same `get` effects.
// oxlint-disable-next-line anti-slop/no-module-mocking
vi.mock('~/util/cache.server/cache_loaders', () => {
  const game = (aiKey: 'word_meanings' | 'more_hints') => ({
    word_puzzle: { get: ({ slug }: { slug: string }) => Effect.succeed(state.puzzles.get(slug)) },
    current_schedule: {
      get: () =>
        Effect.succeed(
          state.currentPuzzleId === undefined
            ? undefined
            : { puzzle: { id: state.currentPuzzleId } }
        )
    },
    [aiKey]: {
      get: ({ puzzle_id }: { puzzle_id: number }) =>
        Effect.sync(() => {
          state.aiCalls.push(puzzle_id);
          return aiKey === 'word_meanings' ? { words: [] } : { hints: [] };
        })
    }
  });
  return {
    NO_CACHE_PARAMS: {},
    CACHE: { padavali: game('word_meanings'), padajala: game('more_hints') }
  };
});

// Run router effects directly (the app runtime needs full production config).
// oxlint-disable-next-line anti-slop/no-module-mocking
vi.mock('~/effect/run', () => ({
  runTrpcEffect: <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect)
}));

const { public_ai_router } = await import('./public_ai');

const outcome = (results: PromiseSettledResult<unknown>[]) =>
  results.map((r) => {
    if (r.status === 'fulfilled') return 'ok';
    const cause = r.reason instanceof TRPCError ? r.reason.cause : undefined;
    return cause instanceof NotFoundError ? 'not_found' : r.reason;
  });

const setup = (puzzle: Puzzle, currentPuzzleId?: number) => {
  state.puzzles = new Map([[puzzle.slug, puzzle]]);
  state.currentPuzzleId = currentPuzzleId;
  state.aiCalls = [];
};

const caller = (user: { id: string; role: string } | null) =>
  // SAFETY: the procedures only read `ctx.user?.role`; other session fields are never touched
  public_ai_router.createCaller({ user: user ?? undefined } as Context);

const both = async (user: { id: string; role: string } | null, puzzle: Puzzle) => {
  const c = caller(user);
  const input = { puzzle_id: puzzle.id, puzzle_slug: puzzle.slug };
  return Promise.allSettled([c.get_puzzle_word_meanings(input), c.get_padajala_more_hints(input)]);
};

describe('public_ai visibility gate', () => {
  const draft = { id: 42, slug: 'secret-draft', listed: false };

  it('hides unlisted, non-current puzzles from anonymous callers without generating', async () => {
    setup(draft);
    const results = await both(null, draft);
    expect(outcome(results)).toEqual(['not_found', 'not_found']);
    expect(state.aiCalls).toEqual([]);
  });

  it('serves listed puzzles', async () => {
    const listed = { ...draft, listed: true };
    setup(listed);
    const results = await both(null, listed);
    expect(outcome(results)).toEqual(['ok', 'ok']);
    // AI output is keyed by puzzle id, not slug
    expect(state.aiCalls).toEqual([listed.id, listed.id]);
  });

  it('serves the current scheduled puzzle before it is listed', async () => {
    setup(draft, draft.id);
    const results = await both(null, draft);
    expect(outcome(results)).toEqual(['ok', 'ok']);
  });

  it('lets admins preview unlisted puzzles', async () => {
    setup(draft);
    const results = await both({ id: 'a', role: 'admin' }, draft);
    expect(outcome(results)).toEqual(['ok', 'ok']);
    const user = await both({ id: 'u', role: 'user' }, draft);
    expect(outcome(user)).toEqual(['not_found', 'not_found']);
  });

  it('still rejects an id/slug mismatch', async () => {
    const listed = { ...draft, listed: true };
    setup(listed);
    const results = await both(null, { ...listed, id: 43 });
    expect(outcome(results)).toEqual(['not_found', 'not_found']);
  });
});
