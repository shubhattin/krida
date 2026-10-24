import { Effect } from 'effect';
import { inArray } from 'drizzle-orm';
import { collections, tags } from '~/db/schema';
import { dbRunHttp } from '~/effect/database';
import { createGameSlugHelpers } from '~/game_shell/slug';
import { checkDraft, isValidSlugForKind } from '~/agents/drafts/check_draft';
import type { CreatorOptions } from '~/agents/creator_options';
import type { KindedPuzzleDraft } from '~/agents/drafts/schemas';
import type { ProposePuzzleOutput } from '~/agents/ui_message';

/**
 * Full check of a proposed puzzle: the pure checks plus what needs the database (slug taken,
 * collections exist, which tags are new). Run by `propose_puzzle` and again on add.
 */
export const checkDraftWithDatabase = Effect.fn('agents.check_draft_with_database')(function* (
  input: KindedPuzzleDraft,
  options: { slugOverride?: string; creator_options?: Partial<CreatorOptions> | null } = {}
) {
  const local = checkDraft(input, options.slugOverride, options.creator_options);
  const errors = [...local.errors];

  const collectionIds = [...new Set(input.draft.collection_ids)];
  const [slugAvailability, existingTags, existingCollections] = yield* Effect.all(
    [
      isValidSlugForKind(input.kind, local.slug)
        ? createGameSlugHelpers({
            kind: input.kind,
            isValidSlug: (slug) => isValidSlugForKind(input.kind, slug)
          }).resolve_slug_availability(local.slug)
        : Effect.succeed(null),
      local.tags.length === 0
        ? Effect.succeed([])
        : dbRunHttp('agents.draft.existing_tags', (client) =>
            client.select({ slug: tags.slug }).from(tags).where(inArray(tags.slug, local.tags))
          ),
      collectionIds.length === 0
        ? Effect.succeed([])
        : dbRunHttp('agents.draft.collections', (client) =>
            client
              .select({ id: collections.id, title: collections.title })
              .from(collections)
              .where(inArray(collections.id, collectionIds))
          )
    ],
    { concurrency: 'unbounded' }
  );

  if (slugAvailability && !slugAvailability.available) {
    errors.push(`Slug “${local.slug}” is already used by another ${input.kind} puzzle.`);
  } else if (slugAvailability && 'redirect_conflict' in slugAvailability) {
    errors.push(
      `Slug “${local.slug}” is an old URL of another ${input.kind} puzzle; pick another.`
    );
  }

  const foundCollections = new Set(existingCollections.map((collection) => collection.id));
  for (const id of collectionIds) {
    if (!foundCollections.has(id)) errors.push(`Collection #${id} does not exist.`);
  }

  const existing = new Set(existingTags.map((tag) => tag.slug));
  return {
    ok: errors.length === 0,
    errors,
    warnings: local.warnings,
    slug: local.slug,
    tags: local.tags.map((slug) => ({ slug, is_new: !existing.has(slug) })),
    collections: existingCollections
  } satisfies ProposePuzzleOutput;
});
