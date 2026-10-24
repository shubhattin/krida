/**
 * Baseline security headers for every response. Deliberately no full CSP (Turnstile, PostHog,
 * Google sign-in, fonts and CDN images would all need allowlisting) — only framing is locked.
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy': "frame-ancestors 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000'
} as const;

export function withSecurityHeaders(response: Response): Response {
  // Some responses (redirects, passthrough fetches) have immutable headers — rebuild those.
  let out = response;
  try {
    out.headers.set('X-Content-Type-Options', 'nosniff');
  } catch {
    out = new Response(response.body, response);
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!out.headers.has(name)) out.headers.set(name, value);
  }
  return out;
}
