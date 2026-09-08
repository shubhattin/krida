/**
 * Illustrative: cache completed values, never join another request's fiber.
 */
import { Effect } from 'effect';
import { canShareInFlightFibers } from './platform';

type Result = { ok: true };

type InFlightMemory = {
  value: Result | null;
  inFlight: Effect.Effect<Result> | null;
};

const memory: InFlightMemory = { value: null, inFlight: null };

export const getCached = Effect.fn('getCached')(function* () {
  if (memory.value) return memory.value;

  const load = Effect.sync((): Result => {
    const value: Result = { ok: true };
    memory.value = value;
    memory.inFlight = null;
    return value;
  });

  if (!canShareInFlightFibers()) {
    return yield* load;
  }

  if (memory.inFlight) return yield* memory.inFlight;

  const fetchEffect = yield* Effect.cached(load);
  memory.inFlight = fetchEffect;
  return yield* fetchEffect;
});
