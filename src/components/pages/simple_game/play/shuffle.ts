export function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i]!;
    next[i] = next[j]!;
    next[j] = current;
  }
  return next;
}

/**
 * Shuffle so that few items stay "in front of" their partner: `inPlace(item, index)` marks an
 * item sitting at its answer position. Allows none for short lists, at most one otherwise.
 */
export function shuffleFewInPlace<T>(
  items: readonly T[],
  inPlace: (item: T, index: number) => boolean
) {
  if (items.length < 2) return [...items];
  const allowed = items.length <= 3 ? 0 : 1;
  const count = (list: readonly T[]) => list.filter((item, index) => inPlace(item, index)).length;
  for (let attempt = 0; attempt < 64; attempt++) {
    const next = shuffle(items);
    if (count(next) <= allowed) return next;
  }
  // Rotating an in-place ordering by one leaves nothing in place.
  return [...items.slice(1), items[0]!];
}
