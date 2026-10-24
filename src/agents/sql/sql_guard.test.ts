import { describe, expect, it } from 'vitest';
import { guardSelectQuery } from './sql_guard';

const allowed = (query: string) => expect(guardSelectQuery(query).ok, query).toBe(true);
const blocked = (query: string) => expect(guardSelectQuery(query).ok, query).toBe(false);

describe('guardSelectQuery', () => {
  it('allows plain reads', () => {
    allowed('SELECT kind, count(*) FROM puzzles GROUP BY kind');
    allowed("select * from puzzles where updated_at > now() - interval '7 days';");
    allowed(`WITH plays AS (SELECT puzzle_id, count(*) n FROM puzzle_sessions GROUP BY 1)
      SELECT p.title, plays.n FROM plays JOIN puzzles p ON p.id = plays.puzzle_id ORDER BY 2 DESC LIMIT 10`);
    allowed('SELECT jsonb_array_length(word_list) FROM padavali_puzzles OFFSET 5');
  });

  it('ignores keywords inside strings, quoted identifiers and comments', () => {
    allowed("SELECT title FROM puzzles WHERE title ILIKE '%delete; drop table%'");
    allowed('SELECT 1 AS "update" -- insert into x\n');
    allowed("SELECT 'it''s; fine' AS note");
  });

  it('does not trip on identifiers that contain blocked words', () => {
    allowed('SELECT updated_at, last_listed_at, created_at FROM puzzles');
    allowed("SELECT format('%s plays', count(*)) FROM puzzle_sessions");
  });

  it('blocks writes, DDL and multiple statements', () => {
    blocked('DELETE FROM puzzles');
    blocked('UPDATE puzzles SET listed = true');
    blocked('SELECT 1; DROP TABLE puzzles');
    blocked('WITH d AS (DELETE FROM tags RETURNING *) SELECT * FROM d');
    blocked('SELECT * INTO new_table FROM puzzles');
    blocked('SELECT * FROM puzzles FOR UPDATE');
    blocked('SELECT * FROM puzzles FOR SHARE');
    blocked('SELECT * FROM puzzles FOR KEY SHARE');
    blocked('CREATE TABLE x (id int)');
    blocked('EXPLAIN ANALYZE SELECT 1');
  });

  it('blocks side-effect functions and session changes', () => {
    blocked('SELECT pg_sleep(10)');
    blocked("SELECT set_config('statement_timeout', '0', false)");
    blocked("SELECT nextval('puzzles_id_seq')");
    blocked("SELECT pg_read_file('/etc/passwd')");
    blocked("SELECT * FROM dblink('host=x', 'select 1') AS t(a int)");
  });

  it('rejects dollar quoting and unterminated input', () => {
    blocked('SELECT $$ delete $$');
    blocked("SELECT 'open");
    blocked('SELECT 1 /* never closed');
  });
});
