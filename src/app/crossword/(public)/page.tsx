import type { Metadata } from 'next';
import { getCachedSession } from '~/lib/cache_server_route_data';

export const metadata: Metadata = {
  title: 'Crossword Puzzles'
};

export default async function CrossWordPage() {
  const session = await getCachedSession();
  const is_admin = session?.user.role === 'admin';

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      {/* Decorative background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-[0.07]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary)), transparent 70%)'
        }}
      />
      {/* <CrossWordGameRoot puzzle={examplePuzzle} /> */}
    </main>
  );
}
