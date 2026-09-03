import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { ConfigError } from './errors';

const NonEmptyString = Schema.String.check(Schema.isMinLength(1));

const AppConfigSchema = Schema.Struct({
  dbUrl: NonEmptyString,
  upstashRedisUrl: NonEmptyString,
  upstashRedisToken: NonEmptyString,
  awsRegion: NonEmptyString,
  awsAccessKeyId: NonEmptyString,
  awsSecretAccessKey: NonEmptyString,
  awsS3BucketName: NonEmptyString,
  openaiApiKey: NonEmptyString,
  openrouterApiKey: NonEmptyString,
  qstashToken: NonEmptyString,
  betterAuthUrl: NonEmptyString,
  siteUrl: NonEmptyString,
  cloudfrontUrl: NonEmptyString,
  isDev: Schema.Boolean,
  isProd: Schema.Boolean,
  isQstashEnabled: Schema.Boolean,
  // optionals
  turnstileSecretKey: Schema.optional(NonEmptyString),
  onesignalApiKey: Schema.optional(NonEmptyString),
  onesignalAppId: Schema.optional(NonEmptyString)
});

type AppConfigDecoded = typeof AppConfigSchema.Type;

/** Secrets that are stored as `Redacted` at runtime (override decoded plain strings). */
type RedactedConfigKeys =
  | 'dbUrl'
  | 'upstashRedisToken'
  | 'awsSecretAccessKey'
  | 'openaiApiKey'
  | 'openrouterApiKey'
  | 'qstashToken'
  | 'onesignalApiKey'
  | 'turnstileSecretKey';

/** Service API for the loaded application configuration (secrets held as `Redacted`). */
export type AppConfigService = Omit<AppConfigDecoded, RedactedConfigKeys> & {
  readonly dbUrl: Redacted.Redacted<string>;
  readonly upstashRedisToken: Redacted.Redacted<string>;
  readonly awsSecretAccessKey: Redacted.Redacted<string>;
  readonly openaiApiKey: Redacted.Redacted<string>;
  readonly openrouterApiKey: Redacted.Redacted<string>;
  readonly qstashToken: Redacted.Redacted<string>;
  readonly onesignalApiKey: Redacted.Redacted<string> | undefined;
  readonly turnstileSecretKey: Redacted.Redacted<string> | undefined;
};

/** Resolve Postgres URL from DB_MODE for app runtime and Drizzle Kit scripts. */
export const resolveDbUrl = (env: Record<string, string | undefined>): string | undefined => {
  if (env.DB_MODE === 'PROD') return env.PG_DATABASE_URL1;
  if (env.DB_MODE === 'PREVIEW') return env.PG_DATABASE_URL2;
  if (env.DB_MODE !== undefined && env.DB_MODE !== '') return undefined;
  return env.PG_DATABASE_URL;
};

const isProductionMode = (): boolean => import.meta.env?.PROD === true;

const loadConfig = Effect.fn('loadConfig')(function* () {
  const env = process.env;
  const parsed = Schema.decodeUnknownExit(AppConfigSchema)({
    dbUrl: resolveDbUrl(env),
    upstashRedisUrl: env.UPSTASH_REDIS_REST_URL,
    upstashRedisToken: env.UPSTASH_REDIS_REST_TOKEN,
    awsRegion: env.AWS_REGION,
    awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    awsS3BucketName: env.AWS_S3_FILES_BUCKET_NAME,
    openaiApiKey: env.OPENAI_API_KEY,
    openrouterApiKey: env.OPENROUTER_API_KEY,
    qstashToken: env.QSTASH_TOKEN,
    onesignalApiKey: env.ONESIGNAL_API_KEY,
    onesignalAppId: env.VITE_ONESIGNAL_APP_ID,
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
    betterAuthUrl: env.VITE_BETTER_AUTH_URL,
    siteUrl: env.VITE_SITE_URL,
    cloudfrontUrl: env.VITE_AWS_CLOUDFRONT_URL,
    isDev: import.meta.env?.DEV === true || env.NODE_ENV === 'development',
    isProd: import.meta.env?.PROD === true || env.NODE_ENV === 'production',
    isQstashEnabled: isProductionMode()
  });

  if (parsed._tag === 'Failure') {
    return yield* Effect.fail(
      ConfigError.make({
        message: 'Invalid application configuration',
        cause: parsed.cause
      })
    );
  }

  const data = parsed.value;
  return {
    dbUrl: Redacted.make(data.dbUrl),
    upstashRedisUrl: data.upstashRedisUrl,
    upstashRedisToken: Redacted.make(data.upstashRedisToken),
    awsRegion: data.awsRegion,
    awsAccessKeyId: data.awsAccessKeyId,
    awsSecretAccessKey: Redacted.make(data.awsSecretAccessKey),
    awsS3BucketName: data.awsS3BucketName,
    openaiApiKey: Redacted.make(data.openaiApiKey),
    openrouterApiKey: Redacted.make(data.openrouterApiKey),
    qstashToken: Redacted.make(data.qstashToken),
    onesignalApiKey: data.onesignalApiKey ? Redacted.make(data.onesignalApiKey) : undefined,
    onesignalAppId: data.onesignalAppId,
    turnstileSecretKey: data.turnstileSecretKey
      ? Redacted.make(data.turnstileSecretKey)
      : undefined,
    betterAuthUrl: data.betterAuthUrl,
    siteUrl: data.siteUrl,
    cloudfrontUrl: data.cloudfrontUrl,
    isDev: data.isDev,
    isProd: data.isProd,
    isQstashEnabled: data.isQstashEnabled
  } satisfies AppConfigService;
});

export class AppConfig extends Context.Service<AppConfig, AppConfigService>()('AppConfig') {
  static readonly Live = Layer.effect(AppConfig)(loadConfig());
}
