'use client';

import { useState } from 'react';

type Props = {
  archived_puzzles: { id: number; uuid: string }[];
};

export const ArchivedList = ({ archived_puzzles }: Props) => {
  const selected_puzzle = useState<{ id: number; uuid: string } | null>(null);
  return <div>ArchivedList</div>;
};
