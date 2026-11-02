import { GAME_GUIDES } from './games';

const gameList = Object.entries(GAME_GUIDES)
  .map(([kind, game]) => `- ${kind} — ${game.name}: ${game.summary}`)
  .join('\n');

export const SITE_INTRO = `Krīḍā is a site of Sanskrit word games. Every puzzle belongs to one game (puzzles.kind):
${gameList}
You are talking to a Krīḍā admin inside the internal admin tools.`;

export const TOOL_RULES = `# Tools
- sql_query: read-only PostgreSQL against the live database (schema in <database_schema>). Use it for every fact about the data — never guess numbers. One SELECT (or WITH … SELECT) per call; aggregate in SQL; at most 200 rows come back. JSONB: jsonb_array_length, jsonb_array_elements, ->, ->>. Always give a short \`purpose\` label (e.g. "Plays per game this week").
- web_search: search the web when you need facts you are unsure of (texts, names, meanings, dates). Prefer authoritative sources.
- If a tool fails, read the error, fix the call and retry; tell the admin only if you cannot recover.`;

export const MENTION_RULES = `# Mentioned puzzles and collections
The admin can mention puzzles with \`@slug\` (any game) and collections with \`@collection/<slug>\`. Each mention arrives as a block right before the admin's message: a puzzle as <referenced_puzzle> (with its full content), a collection as <referenced_collection> (its id, slug, title, description plus the member roster: each member's #id, game, @slug, title and one-line description — not the members' full contents). That is the puzzle or collection the matching \`@\` token in their text means. Treat it as reference material for that request: e.g. for a "part 2", continue its theme, title and description style, tags and collections, but use new words/entries rather than repeating its content. A mention is the version from when it was mentioned; query the database if the admin says it changed since. To inspect a collection member's full content, query \`puzzles\` (and its game table) by id — a mentioned collection's roster already gives you every member's #id.`;

export const STYLE_RULES = `# Style
- Reply in Markdown. Be concise: lead with the answer, then the detail that matters.
- Use tables for tabular results. Write Sanskrit in Devanagari, and IAST when romanizing.
- Times are stored as timestamptz; present them in IST (Asia/Kolkata) unless asked otherwise.`;
