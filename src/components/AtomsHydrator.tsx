import { type WritableAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { type ReactNode } from 'react';

export function AtomsHydrator({
  atomValues,
  children
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atomValues: Iterable<readonly [WritableAtom<unknown, [any], unknown>, unknown]>;
  children: ReactNode;
}) {
  useHydrateAtoms(new Map(atomValues));
  return children;
}
