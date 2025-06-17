'use client';

import { useState, lazy, Suspense } from 'react';
import ViewEditPuzzle, { type ViewEditProps } from '~/components/pages/main/ViewEditPuzzle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Skeleton } from '~/components/ui/skeleton';

// Lazy load the PuzzleStats component
const PuzzleStats = lazy(() => import('./PuzzleStats'));

const MainEditPage = ({ word_puzzle, location }: ViewEditProps) => {
  const [value, setValue] = useState('edit');
  if (location !== 'edit_page') return <></>;
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
        <Suspense fallback={<div></div>}>
          <PuzzleStats puzzleId={word_puzzle.id} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default MainEditPage;
