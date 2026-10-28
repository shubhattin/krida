/**
 * Difficulty levels. For now a puzzle in a difficulty collection must also carry the matching
 * tag (enforced on every collection add + in the editors). The reverse does not hold: a
 * difficulty tag alone does not imply collection membership.
 */
export const DIFFICULTY_KEYS = ['easy', 'medium', 'hard', 'elite'] as const;
export type DifficultyKey = (typeof DIFFICULTY_KEYS)[number];

export const DIFFICULTY_LEVELS = [
  { key: 'easy', label: 'Easy', tag_slug: 'easy', collection_slug: 'difficulty-easy' },
  { key: 'medium', label: 'Medium', tag_slug: 'medium', collection_slug: 'difficulty-med' },
  { key: 'hard', label: 'Hard', tag_slug: 'hard', collection_slug: 'difficulty-hard' },
  { key: 'elite', label: 'Elite', tag_slug: 'elite', collection_slug: 'difficulty-elite' }
] as const satisfies readonly {
  key: DifficultyKey;
  label: string;
  tag_slug: string;
  collection_slug: string;
}[];

export const difficultyByKey = (key: DifficultyKey) =>
  DIFFICULTY_LEVELS.find((level) => level.key === key)!;

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_TAG_SLUGS: readonly string[] = DIFFICULTY_LEVELS.map(
  (level) => level.tag_slug
);
export const DIFFICULTY_COLLECTION_SLUGS: readonly string[] = DIFFICULTY_LEVELS.map(
  (level) => level.collection_slug
);

export const difficultyForCollectionSlug = (slug: string) =>
  DIFFICULTY_LEVELS.find((level) => level.collection_slug === slug);

export const difficultyForTagSlug = (slug: string) =>
  DIFFICULTY_LEVELS.find((level) => level.tag_slug === slug);

/** First difficulty tag among `tagSlugs`, in level order (easy → elite). */
export const difficultyFromTags = (tagSlugs: readonly string[]) =>
  DIFFICULTY_LEVELS.find((level) => tagSlugs.includes(level.tag_slug));

/** Tag slugs required by the given collections; these tags cannot be removed in the editors. */
export const requiredDifficultyTagSlugs = (collections: readonly { slug: string }[]) =>
  new Set(
    collections.flatMap((collection) => {
      const level = difficultyForCollectionSlug(collection.slug);
      return level ? [level.tag_slug] : [];
    })
  );

/** `tags` plus any difficulty tag the collections require but that is missing (id 0 = new). */
export const withDifficultyTags = <T extends { id: number; slug: string }>(
  tags: T[],
  collections: readonly { slug: string }[]
): (T | { id: number; slug: string })[] => {
  const have = new Set(tags.map((tag) => tag.slug));
  const missing = [...requiredDifficultyTagSlugs(collections)].filter((slug) => !have.has(slug));
  return missing.length === 0 ? tags : [...tags, ...missing.map((slug) => ({ id: 0, slug }))];
};
