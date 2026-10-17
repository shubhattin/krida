import { createGameSlugHelpers } from '~/game_shell/slug';
import type { SimpleGameKind } from '~/util/games/kinds';
import { isValidSimpleGameSlug } from '~/util/puzzle/slug';

export function createSimpleGameSlugHelpers(kind: SimpleGameKind) {
  return createGameSlugHelpers({
    kind,
    isValidSlug: isValidSimpleGameSlug
  });
}
