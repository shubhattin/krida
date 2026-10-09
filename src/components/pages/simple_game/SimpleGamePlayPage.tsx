'use client';

import { AnveshiPlay } from '~/components/pages/anveshi/AnveshiPlay';
import { BhramitaPlay } from '~/components/pages/bhramita/BhramitaPlay';
import { DvayiPlay } from '~/components/pages/dvayi/DvayiPlay';
import { SurupaPlay } from '~/components/pages/surupa/SurupaPlay';
import { SimpleGamePreviewBanner } from './SimpleGamePreviewBanner';
import { SimpleGamePublicShell } from './SimpleGamePublicShell';
import type { location_list_type } from '~/db/types';
import type { AnveshiPuzzleData } from '~/util/anveshi/data';
import type { BhramitaPuzzleData } from '~/util/bhramita/data';
import type { DvayiPuzzleData } from '~/util/dvayi/data';
import type { SurupaPuzzleData } from '~/util/surupa/data';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { SimpleGamePuzzle } from '~/util/cache.server/simple_game_cache';

export function SimpleGamePlayPage({
  kind,
  location,
  puzzle,
  preview = false
}: {
  kind: SimpleGameKind;
  location: location_list_type;
  puzzle: SimpleGamePuzzle<unknown>;
  preview?: boolean;
}) {
  return (
    <>
      {preview ? (
        <SimpleGamePreviewBanner kind={kind} listed={puzzle.listed} slug={puzzle.slug} />
      ) : null}
      <SimpleGamePublicShell
        kind={kind}
        puzzleId={puzzle.id}
        title={puzzle.title}
        description={puzzle.description}
        attachments={puzzle.attachments}
      >
        {kind === 'dvayi' ? (
          <DvayiPlay
            puzzleId={puzzle.id}
            location={location}
            data={puzzle.puzzle_data as DvayiPuzzleData}
          />
        ) : null}
        {kind === 'bhramita' ? (
          <BhramitaPlay
            puzzleId={puzzle.id}
            location={location}
            data={puzzle.puzzle_data as BhramitaPuzzleData}
          />
        ) : null}
        {kind === 'surupa' ? (
          <SurupaPlay
            puzzleId={puzzle.id}
            location={location}
            data={puzzle.puzzle_data as SurupaPuzzleData}
          />
        ) : null}
        {kind === 'anveshi' ? (
          <AnveshiPlay
            puzzleId={puzzle.id}
            location={location}
            data={puzzle.puzzle_data as AnveshiPuzzleData}
          />
        ) : null}
      </SimpleGamePublicShell>
    </>
  );
}
