/**
 * CSRF guard for cookie-authenticated mutations. The auth cookie is `SameSite=None` (shared across
 * subdomains), so a cross-site page could otherwise POST with the victim's cookie. Browsers send
 * `Sec-Fetch-Site` and/or `Origin` on POST; requests with neither are non-browser clients, which
 * hold no ambient browser credentials.
 */
export function isSameOriginRequest(request: Request, siteUrl?: string): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (origin === new URL(request.url).origin) return true;
  if (!siteUrl) return false;
  try {
    return origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}
