'use client';

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { client } from '~/api/client';
import { GridDimensionsSelect } from '~/components/puzzle/GridDimensionsField';
import { PuzzleAddDialog } from '~/components/puzzle/PuzzleAddDialog';
import { Label } from '~/components/ui/label';
import { PADAJALA_DEFAULT_DIM, PADAJALA_DIM_LIMITS } from '~/util/padajala/grid';
import { isValidPadajalaSlug } from '~/util/puzzle/slug';

const AddPadajalaDialog = () => {
  const navigate = useNavigate();
  const [dimensions, setDimensions] = useState<[number, number]>(PADAJALA_DEFAULT_DIM);

  return (
    <PuzzleAddDialog
      triggerLabel="Add New Puzzle"
      triggerClassName="font-semibold"
      dialogTitle="Add New Padajala"
      dialogDescription="Enter a title, slug, and grid size. You can fill words and the grid on the edit page."
      confirmDescription={({ title, slug }) =>
        `Create puzzle “${title}” with slug “${slug}” as a ${dimensions[0]}×${dimensions[1]} grid?`
      }
      checkSlug={(params) => client.padajala.check_slug_availability.query(params)}
      isValidSlugFn={isValidPadajalaSlug}
      extraFields={
        <div className="space-y-1">
          <Label>Grid size (rows × columns)</Label>
          <GridDimensionsSelect
            value={dimensions}
            onChange={setDimensions}
            limits={PADAJALA_DIM_LIMITS}
          />
          <p className="text-xs text-muted-foreground">
            Changing the grid size later clears the grid and you will need to re-enter letters.
          </p>
        </div>
      }
      onCreate={(fields) =>
        client.padajala.add_puzzle.mutate({ ...fields, grid_dimensions: dimensions })
      }
      onCreated={(id) => navigate({ href: `/padajala/edit/${id}` })}
      onClose={() => setDimensions(PADAJALA_DEFAULT_DIM)}
    />
  );
};

export default AddPadajalaDialog;
