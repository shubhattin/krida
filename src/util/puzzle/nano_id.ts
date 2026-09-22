import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';
import { crossword_puzzles, padavali_puzzles } from '~/db/schema';
import type { DbTransaction } from '~/effect/database';

const UID_LENGTH = 5;
const UID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const MAX_UID_ATTEMPTS = 8;

const createUid = customAlphabet(UID_ALPHABET, UID_LENGTH);

const UID_UNIQUE_CONSTRAINTS = new Set([
  'padavali_puzzles_uid_unique',
  'crossword_puzzles_uid_unique'
]);

type PuzzleTable = typeof padavali_puzzles | typeof crossword_puzzles;

const driverErrorSchema = z
  .object({
    code: z.string().optional(),
    constraint_name: z.string().optional(),
    constraint: z.string().optional(),
    cause: z.unknown().optional()
  })
  .passthrough();

type DriverError = z.infer<typeof driverErrorSchema>;

function isUidConstraint(error: DriverError) {
  const name = error.constraint_name ?? error.constraint;
  return error.code === '23505' && name !== undefined && UID_UNIQUE_CONSTRAINTS.has(name);
}

/** True only for a uid unique violation, including errors wrapped in `cause`. */
export function isUidUniqueViolation(cause: unknown): boolean {
  const seen = new Set<unknown>();
  let current = cause;
  while (!seen.has(current)) {
    const parsed = driverErrorSchema.safeParse(current);
    if (!parsed.success) return false;
    seen.add(current);
    if (isUidConstraint(parsed.data)) return true;
    if (parsed.data.cause === undefined) return false;
    current = parsed.data.cause;
  }
  return false;
}

/**
 * Draw ids until one is free. `isTaken` is the pre-insert check.
 * `attempt` should insert; a uid unique violation is retried, anything else is thrown.
 */
export async function withUniqueUid<T>(options: {
  isTaken: (uid: string) => Promise<boolean>;
  attempt: (uid: string) => Promise<T>;
  createId?: () => string;
}): Promise<T> {
  const createId = options.createId ?? createUid;
  for (let attempt = 0; attempt < MAX_UID_ATTEMPTS; attempt++) {
    const uid = createId();
    if (await options.isTaken(uid)) continue;
    try {
      return await options.attempt(uid);
    } catch (error) {
      if (isUidUniqueViolation(error)) continue;
      throw error;
    }
  }
  throw new Error('Failed to allocate a unique uid');
}

/**
 * Check `uid`, then insert inside a savepoint.
 * A collision rolls back only that savepoint, so the outer transaction can retry.
 */
export function insertWithUniqueUid<T>(
  tx: DbTransaction,
  table: PuzzleTable,
  insert: (tx: DbTransaction, uid: string) => Promise<T>
): Promise<T> {
  return withUniqueUid({
    isTaken: async (uid) => {
      const rows = await tx.select({ id: table.id }).from(table).where(eq(table.uid, uid)).limit(1);
      return rows.length > 0;
    },
    attempt: (uid) => tx.transaction((scoped) => insert(scoped, uid))
  });
}
