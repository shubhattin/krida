import { describe, expect, it } from 'vitest';
import { optional_turnstile_token_schema } from './turnstile_guard';
import { turnstileHostnameMatches } from '~/api/trpc_init';

describe('optional_turnstile_token_schema', () => {
  it('accepts null and omitted tokens', () => {
    expect(optional_turnstile_token_schema.parse(null)).toBeNull();
    expect(optional_turnstile_token_schema.parse(undefined)).toBeUndefined();
    expect(optional_turnstile_token_schema.parse('tok_abc')).toBe('tok_abc');
  });
});

describe('turnstileHostnameMatches', () => {
  const site = 'https://krida.example.org';
  it('requires the site hostname when enforced', () => {
    expect(turnstileHostnameMatches('krida.example.org', site, true)).toBe(true);
    expect(turnstileHostnameMatches('evil.example.org', site, true)).toBe(false);
    expect(turnstileHostnameMatches(undefined, site, true)).toBe(false);
  });
  it('is a no-op outside production', () => {
    expect(turnstileHostnameMatches('preview-abc.vercel.app', site, false)).toBe(true);
  });
});
