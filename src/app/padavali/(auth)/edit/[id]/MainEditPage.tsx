'use client';

import { lazy, Suspense } from 'react';
import ViewEditPuzzle, { type ViewEditProps } from '~/components/pages/main/ViewEditPuzzle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

const PuzzleStats = lazy(() => import('./PuzzleStats'));

const MainEditPage = ({ word_puzzle }: ViewEditProps) => {
  return (
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="stats">Puzzle Stats</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <ViewEditPuzzle word_puzzle={word_puzzle} key={word_puzzle.id} />
      </TabsContent>
      <TabsContent value="stats">
        <Suspense fallback={<div></div>}>
          <PuzzleStats puzzleId={word_puzzle.id} puzzleTitle={word_puzzle.title} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default MainEditPage;
