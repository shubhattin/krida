'use client';

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { client } from '~/api/client';
import { PuzzleAddDialog } from '~/components/puzzle/PuzzleAddDialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  CROSSWORD_DEFAULT_DIM,
  CROSSWORD_MAX_DIM,
  CROSSWORD_MIN_DIM,
  clampDimension
} from '~/util/cross_word/grid';
import { isValidCrosswordSlug } from '~/util/puzzle/slug';

const AddCrosswordDialog = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState(CROSSWORD_DEFAULT_DIM[0]);
  const [cols, setCols] = useState(CROSSWORD_DEFAULT_DIM[1]);

  return (
    <PuzzleAddDialog
      triggerLabel="Add New Puzzle"
      triggerClassName="font-semibold"
      dialogTitle="Add New Crossword"
      dialogDescription="Enter a title, slug, and grid size. You can fill words and the grid on the edit page."
      confirmDescription={({ title, slug }) =>
        `Create puzzle “${title}” with slug “${slug}” as a ${clampDimension(rows)}×${clampDimension(cols)} grid?`
      }
      checkSlug={(params) => client.crossword.check_slug_availability.query(params)}
      isValidSlugFn={isValidCrosswordSlug}
      extraFields={
        <div className="space-y-1">
          <Label>Grid size (rows × columns)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={CROSSWORD_MIN_DIM}
              max={CROSSWORD_MAX_DIM}
              value={rows}
              onChange={(event) =>
                setRows(Number(event.currentTarget.value) || CROSSWORD_MIN_DIM)
              }
              className="w-20"
              aria-label="Rows"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              min={CROSSWORD_MIN_DIM}
              max={CROSSWORD_MAX_DIM}
              value={cols}
              onChange={(event) =>
                setCols(Number(event.currentTarget.value) || CROSSWORD_MIN_DIM)
              }
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
        client.crossword.add_puzzle.mutate({
          ...fields,
          grid_dimensions: [clampDimension(rows), clampDimension(cols)]
        })
      }
      onCreated={(id) => navigate({ href: `/padajala/edit/${id}` })}
      onClose={() => {
        setRows(CROSSWORD_DEFAULT_DIM[0]);
        setCols(CROSSWORD_DEFAULT_DIM[1]);
      }}
    />
  );
};

export default AddCrosswordDialog;
