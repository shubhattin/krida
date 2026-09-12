import { describe, expect, it } from 'vitest';
import { optional_turnstile_token_schema } from './turnstile_guard';

describe('optional_turnstile_token_schema', () => {
  it('accepts null and omitted tokens', () => {
    expect(optional_turnstile_token_schema.parse(null)).toBeNull();
    expect(optional_turnstile_token_schema.parse(undefined)).toBeUndefined();
    expect(optional_turnstile_token_schema.parse('tok_abc')).toBe('tok_abc');
  });
});
