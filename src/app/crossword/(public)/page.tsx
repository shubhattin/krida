import type { Metadata } from 'next';
import { getCachedSession } from '~/lib/cache_server_route_data';
import { db } from '~/db/db';
import { crossord_puzzles } from '~/db/schema';
import { eq, desc } from 'drizzle-orm';
import { CrossordPuzzleSchemaZod } from '~/db/schema_zod';
import CrosswordPublicClient from '~/components/pages/cross_word/CrosswordPublicClient';

export const metadata: Metadata = {
  title: 'Crossword Puzzles'
};

export default async function CrossWordPage() {
  const sessionPromise = getCachedSession();
  const rowsPromise = db
    .select()
    .from(crossord_puzzles)
    .where(eq(crossord_puzzles.listed, true))
    .orderBy(desc(crossord_puzzles.last_listed_at), desc(crossord_puzzles.created_at));

  const [session, rows] = await Promise.all([sessionPromise, rowsPromise]);
  const is_admin = session?.user.role === 'admin';
  const puzzles = rows.map((row) => CrossordPuzzleSchemaZod.parse(row));

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)'
        }}
      />
      <CrosswordPublicClient puzzles={puzzles} isAdmin={!!is_admin} />
    </main>
  );
}
