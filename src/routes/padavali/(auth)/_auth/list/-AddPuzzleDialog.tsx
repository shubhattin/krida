'use client';

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { client } from '~/api/client';
import { GridDimensionsSelect } from '~/components/puzzle/GridDimensionsField';
import { PuzzleAddDialog } from '~/components/puzzle/PuzzleAddDialog';
import { Label } from '~/components/ui/label';
import { DEFAULT_GRID_DIMENSIONS, PADAVALI_DIM_LIMITS } from '~/util/puzzle/slug';

const AddPuzzleDialog = () => {
  const navigate = useNavigate();
  const [dimensions, setDimensions] = useState<[number, number]>(DEFAULT_GRID_DIMENSIONS);

  return (
    <PuzzleAddDialog
      triggerLabel="Add New Puzzle"
      triggerClassName="font-semibold"
      dialogTitle="Add New Puzzle"
      dialogDescription="Enter a title, slug, and grid size. You can fill in words and grid on the edit page."
      confirmDescription={({ title, slug }) =>
        `Create puzzle “${title}” with slug “${slug}” as a ${dimensions[0]}×${dimensions[1]} grid?`
      }
      lipi
      checkSlug={(params) => client.puzzle.check_slug_availability.query(params)}
      extraFields={
        <div className="space-y-1">
          <Label>Grid size (rows × columns)</Label>
          <GridDimensionsSelect
            value={dimensions}
            onChange={setDimensions}
            limits={PADAVALI_DIM_LIMITS}
          />
          <p className="text-xs text-muted-foreground">
            Changing the grid size later clears the grid and you will need to re-enter letters.
          </p>
        </div>
      }
      onCreate={(fields) =>
        client.puzzle.add_puzzle.mutate({ ...fields, grid_dimensions: dimensions })
      }
      onCreated={(id) => navigate({ href: `/padavali/edit/${id}` })}
      onClose={() => setDimensions(DEFAULT_GRID_DIMENSIONS)}
    />
  );
};

export default AddPuzzleDialog;
