'use client';

import { useNavigate } from '@tanstack/react-router';
import { client } from '~/api/client';
import { PuzzleAddDialog } from '~/components/puzzle/PuzzleAddDialog';

const AddPuzzleDialog = () => {
  const navigate = useNavigate();

  return (
    <PuzzleAddDialog
      triggerLabel="Add New Puzzle"
      triggerClassName="font-semibold"
      dialogTitle="Add New Puzzle"
      dialogDescription="Enter a title and slug. You can fill in words and grid on the edit page."
      lipi
      checkSlug={(params) => client.puzzle.check_slug_availability.query(params)}
      onCreate={(fields) => client.puzzle.add_puzzle.mutate(fields)}
      onCreated={(id) => navigate({ href: `/padavali/edit/${id}` })}
    />
  );
};

export default AddPuzzleDialog;
