'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PencilIcon, SettingsIcon } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import CrossWordGameRoot from '~/components/pages/cross_word/CrossWordGame/CrossWordGameRoot';
import type { CrossordPuzzle } from '~/db/schema_zod';

type PublicCard = Pick<
  CrossordPuzzle,
  | 'id'
  | 'title'
  | 'description'
  | 'grid_dimensions'
  | 'grid_data'
  | 'word_list'
  | 'listed'
  | 'created_at'
  | 'updated_at'
  | 'slug'
  | 'last_listed_at'
>;

type CrosswordPublicClientProps = {
  puzzles: PublicCard[];
  isAdmin: boolean;
};

export default function CrosswordPublicClient({ puzzles, isAdmin }: CrosswordPublicClientProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = selectedId != null ? puzzles.find((p) => p.id === selectedId) : null;

  if (selected) {
    return (
      <div className="relative">
        <div className="absolute top-2 left-2 z-20 flex flex-wrap items-center gap-2 sm:top-4 sm:left-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedId(null)}
          >
            <ArrowLeftIcon className="size-4 shrink-0" />
            Back to puzzles
          </Button>
          {isAdmin ? (
            <Button
              render={
                <Link
                  href={`/crossword/edit/${selected.id}`}
                  className="inline-flex items-center gap-1.5"
                />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              className="bg-background/80 backdrop-blur-sm"
            >
              <PencilIcon className="size-3.5 shrink-0" />
              Edit puzzle
            </Button>
          ) : null}
        </div>
        <CrossWordGameRoot puzzle={selected as CrossordPuzzle} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crossword Puzzles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a puzzle to play. More will appear as they are published.
          </p>
        </div>
        {isAdmin ? (
          <Button
            render={<Link href="/crossword/list" className="inline-flex items-center gap-2" />}
            nativeButton={false}
            variant="outline"
          >
            <SettingsIcon className="size-4 shrink-0" />
            Admin puzzles
          </Button>
        ) : null}
      </div>

      {puzzles.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No listed puzzles yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {puzzles.map((puzzle) => (
            <button
              key={puzzle.id}
              type="button"
              onClick={() => setSelectedId(puzzle.id)}
              className="text-left"
            >
              <Card className="border-l-3 border-l-primary/40 transition-all duration-200 hover:translate-x-0.5 hover:border-l-primary hover:bg-slate-50 hover:shadow-md dark:hover:bg-slate-800/60">
                <CardHeader>
                  <CardTitle>{puzzle.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {puzzle.description?.trim()
                      ? puzzle.description
                      : `${puzzle.grid_dimensions[0]}×${puzzle.grid_dimensions[1]} grid`}
                  </CardDescription>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
