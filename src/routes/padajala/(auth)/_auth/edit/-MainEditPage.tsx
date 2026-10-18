'use client';

import { lazy, Suspense } from 'react';
import ViewEditPadajala, {
  type ViewEditPadajalaProps
} from '~/components/pages/padajala/ViewEditPadajala';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

const PadajalaPuzzleStats = lazy(() => import('./-PadajalaPuzzleStats'));

const MainEditPage = ({
  puzzle,
  catalog
}: {
  puzzle: ViewEditPadajalaProps['puzzle'];
  catalog: ViewEditPadajalaProps['catalog'];
}) => {
  return (
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="stats">Puzzle Stats</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">
        <ViewEditPadajala puzzle={puzzle} catalog={catalog} key={puzzle.id} />
      </TabsContent>
      <TabsContent value="stats">
        <Suspense fallback={<div></div>}>
          <PadajalaPuzzleStats puzzleId={puzzle.id} puzzleTitle={puzzle.title} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};

export default MainEditPage;
