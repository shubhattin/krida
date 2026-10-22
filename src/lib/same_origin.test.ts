import { describe, expect, it } from 'vitest';
import { isSameOriginRequest } from './same_origin';

const req = (headers: Record<string, string>, url = 'https://krida.example.org/api/trpc/x') =>
  new Request(url, { method: 'POST', headers });

describe('isSameOriginRequest', () => {
  it('trusts Sec-Fetch-Site when present', () => {
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'same-site' }))).toBe(false);
    expect(isSameOriginRequest(req({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(
      isSameOriginRequest(
        req({ 'sec-fetch-site': 'cross-site', origin: 'https://krida.example.org' })
      )
    ).toBe(false);
  });

  it('falls back to Origin', () => {
    expect(isSameOriginRequest(req({ origin: 'https://krida.example.org' }))).toBe(true);
    expect(isSameOriginRequest(req({ origin: 'https://evil.example.org' }))).toBe(false);
    expect(
      isSameOriginRequest(
        req({ origin: 'https://krida.example.org' }, 'http://internal:3000/api/trpc/x'),
        'https://krida.example.org/'
      )
    ).toBe(true);
  });

  it('allows non-browser requests with neither header', () => {
    expect(isSameOriginRequest(req({}))).toBe(true);
  });
});
