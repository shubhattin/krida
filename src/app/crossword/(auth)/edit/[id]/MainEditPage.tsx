'use client';

import { lazy, Suspense } from 'react';
import ViewEditCrossword, {
  type ViewEditCrosswordProps
} from '~/components/pages/cross_word/ViewEditCrossword';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

const CrosswordPuzzleStats = lazy(() => import('./CrosswordPuzzleStats'));

const MainEditPage = ({ puzzle }: { puzzle: ViewEditCrosswordProps['puzzle'] }) => {
  return (
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="stats">Puzzle Stats</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <ViewEditCrossword puzzle={puzzle} key={puzzle.id} />
      </TabsContent>
      <TabsContent value="stats">
        <Suspense fallback={<div></div>}>
          <CrosswordPuzzleStats puzzleId={puzzle.id} puzzleTitle={puzzle.title} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default MainEditPage;
