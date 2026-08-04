import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { AppConfig } from './config';
import { NotificationError, ConfigError } from './errors';

const notificationOptionsSchema = Schema.Struct({
  name: Schema.String,
  headings: Schema.Record(Schema.String, Schema.String),
  contents: Schema.Record(Schema.String, Schema.String),
  target_channel: Schema.optional(Schema.String),
  included_segments: Schema.optional(Schema.Array(Schema.String)),
  chrome_web_image: Schema.optional(Schema.String),
  url: Schema.optional(Schema.NullOr(Schema.String))
});

export type NotificationOptions = typeof notificationOptionsSchema.Type;

const tryNotify = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => NotificationError.make({ operation, cause })
  }).pipe(Effect.annotateLogs({ category: 'notification', operation }));

export class NotificationService extends Context.Service<
  NotificationService,
  {
    readonly send: (
      options: NotificationOptions
    ) => Effect.Effect<unknown, NotificationError | ConfigError>;
  }
>()('NotificationService') {
  static readonly Live = Layer.effect(NotificationService)(
    Effect.gen(function* () {
      const config = yield* AppConfig;

      return {
        send: (options) =>
          Effect.gen(function* () {
            if (!config.onesignalApiKey || !config.onesignalAppId) {
              return yield* Effect.fail(
                ConfigError.make({
                  message: 'OneSignal is not configured'
                })
              );
            }

            const body = yield* Schema.decodeUnknownEffect(notificationOptionsSchema)(options).pipe(
              Effect.mapError((cause) => NotificationError.make({ operation: 'validate', cause }))
            );

            return yield* tryNotify('send', async () => {
              const response = await fetch('https://api.onesignal.com/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json; charset=utf-8',
                  Authorization: `Key ${Redacted.value(config.onesignalApiKey!)}`
                },
                body: JSON.stringify({
                  app_id: config.onesignalAppId,
                  target_channel: body.target_channel ?? 'push',
                  included_segments: body.included_segments ?? ['All'],
                  name: body.name,
                  headings: body.headings,
                  contents: body.contents,
                  ...(body.chrome_web_image ? { chrome_web_image: body.chrome_web_image } : {}),
                  ...(body.url !== undefined ? { url: body.url } : {})
                }),
                signal: AbortSignal.timeout(10_000)
              });

              if (!response.ok) {
                const text = await response.text();
                throw new Error(`OneSignal request failed (${response.status}): ${text}`);
              }

              return response.json();
            });
          })
      };
    })
  );
}
