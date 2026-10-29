/** Public site origin + minimal public routes, so the agent can give shareable links. */

function readSiteUrl(): string {
  const raw = (process.env.VITE_SITE_URL ?? '').trim().split(/\s/)[0] ?? '';
  const cleaned = raw.replace(/\/+$/, '');
  // Defense-in-depth: env is operator-controlled, but keep the <site> tag shape intact.
  if (!/^https?:\/\/[^<>\s]+$/.test(cleaned)) return '';
  return cleaned;
}

/** `<site>` section content, rebuilt on every agent creation (so new and old chats get it). */
export function buildSiteContext(): string {
  const origin = readSiteUrl();
  if (!origin) {
    return `Public site origin (VITE_SITE_URL): (not set — use relative paths only)
Public routes (minimal, enough to link answers):
- / — hub home (supports ?game=<kind>#<kind> to deep-link a game section, e.g. /?game=padavali#padavali)
- /puzzles — all puzzles; filters: ?game=<kind>, ?q=<text>, ?tag=<slug>, ?level=<difficulty>, ?page=<n> (e.g. /puzzles?game=dvayi). ?game= and ?view=collections are mutually exclusive; ?level= and ?page= are puzzles-view only.
- /puzzles?view=collections — collections list (short alias /collections redirects here; keep only ?q=/ ?tag= here)
- /collections/<slug> — single collection (e.g. /collections/ramayana)
- /<game_kind>/<slug> — play one puzzle (canonical, e.g. /padavali/my-puzzle). Game kinds: padavali, padajala, dvayi, bhramita, surupa, anveshi.
Link rules:
- When the admin asks for a reference or link to share, link the relevant public route with a relative path.
- Find the puzzle slug with sql_query first; only link listed=true (live) puzzles. Never invent slugs.
- Legacy paths (/explore, /<game>/puzzles, /padavali|padajala/puzzle/<slug>) redirect — always give the canonical forms above.`;
  }
  return `Public site origin (VITE_SITE_URL): ${origin}
Public routes (minimal, enough to link answers):
- / — hub home (supports ?game=<kind>#<kind> to deep-link a game section, e.g. /?game=padavali#padavali)
- /puzzles — all puzzles; filters: ?game=<kind>, ?q=<text>, ?tag=<slug>, ?level=<difficulty>, ?page=<n> (e.g. /puzzles?game=dvayi). ?game= and ?view=collections are mutually exclusive; ?level= and ?page= are puzzles-view only.
- /puzzles?view=collections — collections list (short alias /collections redirects here; keep only ?q=/ ?tag= here)
- /collections/<slug> — single collection (e.g. /collections/ramayana)
- /<game_kind>/<slug> — play one puzzle (canonical, e.g. /padavali/my-puzzle). Game kinds: padavali, padajala, dvayi, bhramita, surupa, anveshi.
Link rules:
- When the admin asks for a reference or link to share, link the relevant public route.
- Prefer absolute URLs (<origin><path>, e.g. ${origin}/puzzles?game=padavali) for shareable references; relative paths are fine otherwise.
- Find the puzzle slug with sql_query first; only link listed=true (live) puzzles. Never invent slugs.
- Legacy paths (/explore, /<game>/puzzles, /padavali|padajala/puzzle/<slug>) redirect — always give the canonical forms above.`;
}
