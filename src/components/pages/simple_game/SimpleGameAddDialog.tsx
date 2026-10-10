'use client';

import { useNavigate } from '@tanstack/react-router';
import { client } from '~/api/client';
import { PuzzleAddDialog } from '~/components/puzzle/PuzzleAddDialog';
import { SIMPLE_GAME_META, simpleGameEditHref, type SimpleGameKind } from '~/util/games/kinds';
import { isValidSimpleGameSlug } from '~/util/puzzle/slug';

export function SimpleGameAddDialog({ kind }: { kind: SimpleGameKind }) {
  const navigate = useNavigate();
  const meta = SIMPLE_GAME_META[kind];

  return (
    <PuzzleAddDialog
      triggerLabel={`New ${meta.name}`}
      triggerVariant="default"
      triggerClassName={meta.accent.cta}
      dialogTitle={`New ${meta.name} puzzle`}
      dialogDescription={`${meta.subtitle}. Title and slug are required.`}
      confirmTitle="Create this puzzle?"
      confirmDescription={({ title }) => `“${title}” will open in the editor next.`}
      lipi
      checkSlug={(params) => client[kind].check_slug_availability.query(params)}
      isValidSlugFn={isValidSimpleGameSlug}
      onCreate={(fields) => client[kind].add_puzzle.mutate(fields)}
      onCreated={(id) => navigate({ href: simpleGameEditHref(kind, id) })}
    />
  );
}
