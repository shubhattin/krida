'use client';

import { useQuery } from '@tanstack/react-query';
import { Layers, Tag } from 'lucide-react';
import { useTRPC } from '~/api/client';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';

type Props = {
  tagSlug: string;
  collectionId: string;
  onTagSlugChange: (value: string) => void;
  onCollectionIdChange: (value: string) => void;
};

export function AdminCatalogFilters({
  tagSlug,
  collectionId,
  onTagSlugChange,
  onCollectionIdChange
}: Props) {
  const trpc = useTRPC();
  const tags_q = useQuery(
    trpc.catalog.list_tags.queryOptions({ page: 1, size: 100, search: undefined })
  );
  const collections_q = useQuery(trpc.catalog.list_collections.queryOptions());

  const tagItems = [
    { label: 'Any tag', value: 'all' },
    ...(tags_q.data?.list ?? []).map((tag) => ({ label: tag.slug, value: tag.slug }))
  ];
  const collectionItems = [
    { label: 'Any collection', value: 'all' },
    ...(collections_q.data ?? []).map((collection) => ({
      label: collection.title,
      value: String(collection.id)
    }))
  ];

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Label className="px-1 text-xs font-semibold sm:text-sm" title="Tag">
          <Tag className="size-3.5 sm:size-4" />
          <span className="sr-only">Tag</span>
        </Label>
        <Select
          items={tagItems}
          value={tagSlug}
          onValueChange={(value) => {
            if (value) onTagSlugChange(value);
          }}
        >
          <SelectTrigger size="sm" className="w-36 text-xs sm:text-sm" aria-label="Filter by tag">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {tagItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Label className="px-1 text-xs font-semibold sm:text-sm" title="Collection">
          <Layers className="size-3.5 sm:size-4" />
          <span className="sr-only">Collection</span>
        </Label>
        <Select
          items={collectionItems}
          value={collectionId}
          onValueChange={(value) => {
            if (value) onCollectionIdChange(value);
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-40 text-xs sm:text-sm"
            aria-label="Filter by collection"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {collectionItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
