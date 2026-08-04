import { describe, expect, it } from 'vitest';
import { resolveDbUrl } from './config';

const env = (vars: Record<string, string | undefined>): NodeJS.ProcessEnv => {
  const result: NodeJS.ProcessEnv = { NODE_ENV: 'test' };
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

describe('resolveDbUrl', () => {
  it('uses PG_DATABASE_URL by default', () => {
    expect(
      resolveDbUrl(
        env({
          PG_DATABASE_URL: 'postgresql://local/db'
        })
      )
    ).toBe('postgresql://local/db');
  });

  it('prefers PROD url when DB_MODE=PROD', () => {
    expect(
      resolveDbUrl(
        env({
          DB_MODE: 'PROD',
          PG_DATABASE_URL: 'postgresql://local/db',
          PG_DATABASE_URL1: 'postgresql://prod/db'
        })
      )
    ).toBe('postgresql://prod/db');
  });

  it('falls back to PG_DATABASE_URL when PROD url missing', () => {
    expect(
      resolveDbUrl(
        env({
          DB_MODE: 'PROD',
          PG_DATABASE_URL: 'postgresql://local/db'
        })
      )
    ).toBe('postgresql://local/db');
  });

  it('prefers PREVIEW url when DB_MODE=PREVIEW', () => {
    expect(
      resolveDbUrl(
        env({
          DB_MODE: 'PREVIEW',
          PG_DATABASE_URL: 'postgresql://local/db',
          PG_DATABASE_URL2: 'postgresql://preview/db'
        })
      )
    ).toBe('postgresql://preview/db');
  });

  it('returns undefined when no url is set', () => {
    expect(resolveDbUrl(env({}))).toBeUndefined();
  });
});
