'use client';

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { client } from '~/api/client';
import { PuzzleAddDialog } from '~/components/puzzle/PuzzleAddDialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  PADAJALA_DEFAULT_DIM,
  PADAJALA_MAX_DIM,
  PADAJALA_MIN_DIM,
  clampDimension
} from '~/util/padajala/grid';
import { isValidPadajalaSlug } from '~/util/puzzle/slug';

const AddPadajalaDialog = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState(PADAJALA_DEFAULT_DIM[0]);
  const [cols, setCols] = useState(PADAJALA_DEFAULT_DIM[1]);

  return (
    <PuzzleAddDialog
      triggerLabel="Add New Puzzle"
      triggerClassName="font-semibold"
      dialogTitle="Add New Padajala"
      dialogDescription="Enter a title, slug, and grid size. You can fill words and the grid on the edit page."
      confirmDescription={({ title, slug }) =>
        `Create puzzle “${title}” with slug “${slug}” as a ${clampDimension(rows)}×${clampDimension(cols)} grid?`
      }
      checkSlug={(params) => client.padajala.check_slug_availability.query(params)}
      isValidSlugFn={isValidPadajalaSlug}
      extraFields={
        <div className="space-y-1">
          <Label>Grid size (rows × columns)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={PADAJALA_MIN_DIM}
              max={PADAJALA_MAX_DIM}
              value={rows}
              onChange={(event) => setRows(Number(event.currentTarget.value) || PADAJALA_MIN_DIM)}
              className="w-20"
              aria-label="Rows"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              min={PADAJALA_MIN_DIM}
              max={PADAJALA_MAX_DIM}
              value={cols}
              onChange={(event) => setCols(Number(event.currentTarget.value) || PADAJALA_MIN_DIM)}
              className="w-20"
              aria-label="Columns"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Changing the grid size later clears the grid and you will need to re-enter letters.
          </p>
        </div>
      }
      onCreate={(fields) =>
        client.padajala.add_puzzle.mutate({
          ...fields,
          grid_dimensions: [clampDimension(rows), clampDimension(cols)]
        })
      }
      onCreated={(id) => navigate({ href: `/padajala/edit/${id}` })}
      onClose={() => {
        setRows(PADAJALA_DEFAULT_DIM[0]);
        setCols(PADAJALA_DEFAULT_DIM[1]);
      }}
    />
  );
};

export default AddPadajalaDialog;
