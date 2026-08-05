import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { Client } from '@upstash/qstash';
import { AppConfig } from './config';
import { QueueError, ValidationError } from './errors';

const PositiveInt = Schema.Int.check(Schema.isGreaterThan(0));
const NonNegInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
const Key32 = Schema.String.check(Schema.isLengthBetween(32, 32));
const NonEmptyString = Schema.String.check(Schema.isMinLength(1));

export const scheduleListingPayloadSchema = Schema.Struct({
  puzzle_id: PositiveInt,
  schedule_id: PositiveInt,
  listing_verify_key: Key32
});

export const scheduledPuzzleNotificationPayloadSchema = Schema.Struct({
  puzzle_id: PositiveInt,
  schedule_id: PositiveInt,
  notification_key: Key32
});

export const aiBatchResultsPayloadSchema = Schema.Struct({
  batch_id: NonEmptyString,
  poll_attempt: NonNegInt
});

export type ScheduleListingPayload = typeof scheduleListingPayloadSchema.Type;
export type ScheduledPuzzleNotificationPayload =
  typeof scheduledPuzzleNotificationPayloadSchema.Type;
export type AiBatchResultsPayload = typeof aiBatchResultsPayloadSchema.Type;

/** QStash rejects negative/fractional delays; clamp after computing start_time − now − skew. */
export const qstashDelaySeconds = (seconds: number): number => Math.max(0, Math.floor(seconds));

const tryQueue = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => QueueError.make({ operation, cause })
  }).pipe(Effect.annotateLogs({ category: 'qstash', operation }));

export class QStashPublisher extends Context.Service<
  QStashPublisher,
  {
    readonly publishScheduleListing: (
      data: ScheduleListingPayload,
      delay_s: number
    ) => Effect.Effect<void, QueueError>;
    readonly publishCrosswordScheduleListing: (
      data: ScheduleListingPayload,
      delay_s: number
    ) => Effect.Effect<void, QueueError>;
    readonly publishScheduledPuzzleNotification: (
      data: ScheduledPuzzleNotificationPayload,
      delay_s: number
    ) => Effect.Effect<void, QueueError>;
    readonly publishAiBatchResults: (
      data: AiBatchResultsPayload,
      delay_s: number
    ) => Effect.Effect<void, QueueError>;
  }
>()('QStashPublisher') {
  static readonly Live = Layer.effect(QStashPublisher)(
    Effect.gen(function* () {
      const config = yield* AppConfig;
      const client = new Client({ token: Redacted.value(config.qstashToken) });
      const baseUrl = `${config.siteUrl}/api/qstash`;
      const enabled = config.isQstashEnabled;

      const publish = <A>(
        operation: string,
        path: string,
        body: A,
        delay_s: number
      ): Effect.Effect<void, QueueError> => {
        if (!enabled) return Effect.void;
        return tryQueue(operation, async () => {
          await client.publishJSON({
            url: `${baseUrl}${path}`,
            delay: delay_s,
            body
          });
          console.log(`[qstash] published ${operation} (delay: ${delay_s}s)`);
        });
      };

      return {
        publishScheduleListing: (data, delay_s) =>
          publish('schedule_listing', '/schedule_listing', data, delay_s),
        publishCrosswordScheduleListing: (data, delay_s) =>
          publish('crossword_schedule_listing', '/crossword/schedule_listing', data, delay_s),
        publishScheduledPuzzleNotification: (data, delay_s) =>
          publish('new_puzzle_notification', '/new_puzzle_notification', data, delay_s),
        publishAiBatchResults: (data, delay_s) =>
          publish('save_ai_batch_results', '/save_ai_batch_results', data, delay_s)
      };
    })
  );
}

export const decodeQstashPayload = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  input: unknown
): Effect.Effect<S['Type'], ValidationError> =>
  Effect.try({
    try: () => Schema.decodeUnknownSync(schema)(input),
    catch: (cause) =>
      ValidationError.make({
        message: 'Invalid QStash payload',
        cause
      })
  });
