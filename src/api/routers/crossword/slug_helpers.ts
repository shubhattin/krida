import { createGameSlugHelpers } from '~/game_shell/slug';
import { isValidCrosswordSlug } from '~/util/puzzle/slug';

export const {
  resolve_slug_availability,
  assert_slug_usable_for_mutation,
  delete_redirect_for_slug,
  upsert_redirect_for_puzzle
} = createGameSlugHelpers({
  kind: 'crossword',
  isValidSlug: isValidCrosswordSlug
});
