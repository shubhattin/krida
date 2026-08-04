import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { ConfigError } from './errors';

const AppConfigSchema = Schema.Struct({
  dbUrl: Schema.String,
  upstashRedisUrl: Schema.String,
  upstashRedisToken: Schema.String,
  awsRegion: Schema.String,
  awsAccessKeyId: Schema.String,
  awsSecretAccessKey: Schema.String,
  awsS3BucketName: Schema.String,
  openaiApiKey: Schema.String,
  openrouterApiKey: Schema.String,
  qstashToken: Schema.optional(Schema.String),
  onesignalApiKey: Schema.optional(Schema.String),
  onesignalAppId: Schema.optional(Schema.String),
  turnstileSecretKey: Schema.optional(Schema.String),
  betterAuthUrl: Schema.optional(Schema.String),
  siteUrl: Schema.optional(Schema.String),
  cloudfrontUrl: Schema.optional(Schema.String),
  isDev: Schema.Boolean,
  isProd: Schema.Boolean,
  isQstashEnabled: Schema.Boolean
});

export type AppConfigShape = {
  readonly dbUrl: Redacted.Redacted<string>;
  readonly upstashRedisUrl: string;
  readonly upstashRedisToken: Redacted.Redacted<string>;
  readonly awsRegion: string;
  readonly awsAccessKeyId: string;
  readonly awsSecretAccessKey: Redacted.Redacted<string>;
  readonly awsS3BucketName: string;
  readonly openaiApiKey: Redacted.Redacted<string>;
  readonly openrouterApiKey: Redacted.Redacted<string>;
  readonly qstashToken: Redacted.Redacted<string> | undefined;
  readonly onesignalApiKey: Redacted.Redacted<string> | undefined;
  readonly onesignalAppId: string | undefined;
  readonly turnstileSecretKey: Redacted.Redacted<string> | undefined;
  readonly betterAuthUrl: string | undefined;
  readonly siteUrl: string | undefined;
  readonly cloudfrontUrl: string | undefined;
  readonly isDev: boolean;
  readonly isProd: boolean;
  readonly isQstashEnabled: boolean;
};

/** Resolve Postgres URL from DB_MODE for app runtime and Drizzle Kit scripts. */
export const resolveDbUrl = (env: NodeJS.ProcessEnv): string | undefined => {
  if (env.DB_MODE === 'PROD') return env.PG_DATABASE_URL1 ?? env.PG_DATABASE_URL;
  if (env.DB_MODE === 'PREVIEW') return env.PG_DATABASE_URL2 ?? env.PG_DATABASE_URL;
  return env.PG_DATABASE_URL;
};

const isProductionMode = (env: NodeJS.ProcessEnv): boolean =>
  env.VERCEL_ENV === 'production' ||
  (env.VERCEL_ENV === undefined && env.NODE_ENV === 'production');

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
    onesignalAppId: env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY,
    betterAuthUrl: env.NEXT_PUBLIC_BETTER_AUTH_URL,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    cloudfrontUrl: env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
    isQstashEnabled: Boolean(env.NEXT_PUBLIC_SITE_URL) && isProductionMode(env)
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
    qstashToken: data.qstashToken ? Redacted.make(data.qstashToken) : undefined,
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
  } satisfies AppConfigShape;
});

export class AppConfig extends Context.Service<AppConfig, AppConfigShape>()('AppConfig') {
  static readonly Live = Layer.effect(AppConfig)(loadConfig());
}
