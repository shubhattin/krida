import { describe, expect, it } from 'vitest';
import { withSecurityHeaders } from './security_headers';

describe('withSecurityHeaders', () => {
  it('adds framing and sniffing headers', () => {
    const res = withSecurityHeaders(new Response('ok'));
    expect(res.headers.get('content-security-policy')).toBe("frame-ancestors 'self'");
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('handles immutable headers (redirects)', async () => {
    const res = withSecurityHeaders(Response.redirect('https://example.org/', 301));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://example.org/');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('keeps headers a handler already set', () => {
    const res = withSecurityHeaders(
      new Response('ok', { headers: { 'Referrer-Policy': 'no-referrer' } })
    );
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });
});
