/**
 * Static check for the agents' SQL tool. The tool connects with the main database role, so this
 * is the first line of defence; the query also runs in a READ ONLY transaction with a statement
 * timeout (`run_readonly_query.ts`), which Postgres itself enforces.
 *
 * Rules: one statement, starting with SELECT or WITH, and no keyword or function that writes,
 * locks, changes session state or touches the server's files. False positives are acceptable —
 * the model gets the reason back and rewrites the query.
 */

const BLOCKED_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'merge',
  'upsert',
  'drop',
  'alter',
  'create',
  'truncate',
  'grant',
  'revoke',
  'copy',
  'call',
  'do',
  'execute',
  'prepare',
  'deallocate',
  'listen',
  'unlisten',
  'notify',
  'vacuum',
  'analyze',
  'reindex',
  'cluster',
  'comment',
  'lock',
  'refresh',
  'set',
  'reset',
  'begin',
  'commit',
  'rollback',
  'savepoint',
  'release',
  'discard',
  'load',
  'import',
  'security',
  'into',
  'for'
] as const;

/** Functions with side effects or server access. Matched as `name(`. */
const BLOCKED_FUNCTION_PREFIXES = [
  'pg_sleep',
  'pg_read',
  'pg_ls_',
  'pg_stat_file',
  'pg_write',
  'pg_file',
  'pg_terminate',
  'pg_cancel',
  'pg_reload',
  'pg_rotate',
  'pg_advisory',
  'pg_try_advisory',
  'pg_notify',
  'pg_promote',
  'pg_create',
  'pg_drop',
  'pg_switch',
  'pg_backup',
  'lo_',
  'dblink',
  'set_config',
  'nextval',
  'setval',
  'query_to_xml',
  'table_to_xml',
  'cursor_to_xml',
  'database_to_xml',
  'schema_to_xml'
] as const;

const MAX_QUERY_LENGTH = 8_000;

export type SqlGuardResult = { ok: true; query: string } | { ok: false; reason: string };

/**
 * Blank out comments, string literals and quoted identifiers, so keywords inside them neither
 * block a safe query nor hide an unsafe one. Dollar-quoting is rejected outright.
 */
export function maskSql(query: string): string | null {
  let out = '';
  let index = 0;
  while (index < query.length) {
    const char = query[index]!;
    const next = query[index + 1];
    if (char === '-' && next === '-') {
      const end = query.indexOf('\n', index);
      index = end === -1 ? query.length : end;
      out += ' ';
      continue;
    }
    if (char === '/' && next === '*') {
      const end = query.indexOf('*/', index + 2);
      if (end === -1) return null;
      index = end + 2;
      out += ' ';
      continue;
    }
    if (char === "'" || char === '"') {
      let cursor = index + 1;
      while (cursor < query.length) {
        if (query[cursor] === char) {
          if (query[cursor + 1] === char) {
            cursor += 2;
            continue;
          }
          break;
        }
        cursor += 1;
      }
      if (cursor >= query.length) return null;
      out += char === "'" ? "''" : '"x"';
      index = cursor + 1;
      continue;
    }
    if (
      char === '$' &&
      /[A-Za-z_$]/.test(next ?? '') &&
      /\$[A-Za-z_]*\$/.test(query.slice(index, index + 64))
    ) {
      return null;
    }
    out += char;
    index += 1;
  }
  return out;
}

export function guardSelectQuery(raw: string): SqlGuardResult {
  if (raw.length > MAX_QUERY_LENGTH) {
    return { ok: false, reason: `Query is longer than ${MAX_QUERY_LENGTH} characters.` };
  }
  const query = raw.trim().replace(/;\s*$/, '').trim();
  const masked = maskSql(query);
  if (masked === null) {
    return {
      ok: false,
      reason: 'Unterminated string/comment, or dollar-quoting, which is not allowed.'
    };
  }
  const lowered = masked.toLowerCase();

  if (lowered.includes(';')) {
    return { ok: false, reason: 'Only one statement is allowed (found ";").' };
  }
  if (!/^\s*(select|with)\b/.test(lowered)) {
    return {
      ok: false,
      reason: 'Only SELECT queries (optionally starting with WITH) are allowed.'
    };
  }
  for (const keyword of BLOCKED_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`).test(lowered)) {
      return {
        ok: false,
        reason: `"${keyword.toUpperCase()}" is not allowed in agent queries (read-only SELECTs only).`
      };
    }
  }
  for (const prefix of BLOCKED_FUNCTION_PREFIXES) {
    if (new RegExp(`\\b${prefix}\\w*\\s*\\(`).test(lowered)) {
      return { ok: false, reason: `Function "${prefix}…" is not allowed in agent queries.` };
    }
  }
  return { ok: true, query };
}
