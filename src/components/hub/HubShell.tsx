'use client';

import type { ReactNode } from 'react';
import HubFooter from './HubFooter';
import HubHeader from './HubHeader';
import type { HubData } from './hub_data';
import { tagsByPopularity } from './hub_puzzles';
import { useHubPuzzles } from './useHubPuzzles';

export default function HubShell({ children, data }: { children: ReactNode; data: HubData }) {
  const { puzzles } = useHubPuzzles(data);
  const tags = tagsByPopularity(puzzles).slice(0, 16);
  const nav = {
    collections: data.collections.map((collection) => ({
      slug: collection.slug,
      title: collection.title
    })),
    tags: tags.map((tag) => ({ slug: tag.slug, name: tag.name }))
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <HubHeader initialNav={nav} />
      <main className="flex-1">{children}</main>
      <HubFooter />
    </div>
  );
}
