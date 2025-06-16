'use client';

import { useState, lazy, Suspense } from 'react';
import ViewEditPuzzle, { type ViewEditProps } from '~/components/pages/main/ViewEditPuzzle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Skeleton } from '~/components/ui/skeleton';

// Lazy load the PuzzleStats component
const PuzzleStats = lazy(() => import('./PuzzleStats'));

// Skeleton component for loading state
const PuzzleStatsSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>

    <div className="space-y-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const MainEditPage = ({ word_puzzle, location }: ViewEditProps) => {
  const [value, setValue] = useState('edit');

  return (
    <Tabs defaultValue={value} onValueChange={setValue}>
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="stats">Puzzle Stats</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <ViewEditPuzzle word_puzzle={word_puzzle} key={word_puzzle.id} location={location} />
      </TabsContent>
      <TabsContent value="stats">
        <Suspense fallback={<PuzzleStatsSkeleton />}>
          <PuzzleStats />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default MainEditPage;
