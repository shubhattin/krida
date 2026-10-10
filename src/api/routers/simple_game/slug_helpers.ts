import { createGameSlugHelpers } from '~/game_shell/slug';
import type { SimpleGameKind } from '~/util/games/kinds';
import type { SimpleGameTableSet } from '~/db/schema/simple_game_tables';
import { isValidSimpleGameSlug } from '~/util/puzzle/slug';

export function createSimpleGameSlugHelpers<TData>(
  kind: SimpleGameKind,
  tables: SimpleGameTableSet<TData>
) {
  return createGameSlugHelpers({
    kind,
    tables: { puzzles: tables.puzzles, redirects: tables.redirects },
    isValidSlug: isValidSimpleGameSlug
  });
}
