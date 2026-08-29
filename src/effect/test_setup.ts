delete process.env.DB_MODE;
process.env.PG_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.OPENAI_API_KEY = 'sk_test_123';
process.env.OPENROUTER_API_KEY = 'or_test_123';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.AWS_S3_FILES_BUCKET_NAME = 'test-bucket';
process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'token-test';
process.env.VITE_SITE_URL = 'http://localhost:3000';

import { afterAll } from 'vitest';

afterAll(async () => {
  const { appRuntime } = await import('./runtime');
  await appRuntime.dispose();
});
