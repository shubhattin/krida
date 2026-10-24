import { LayersIcon, TagIcon } from 'lucide-react';
import type { ProposePuzzleOutput } from '~/agents/ui_message';
import { cn } from '~/lib/utils';

/** Tags (new ones marked) and collections of a proposal. */
export function ProposalMeta({
  tags,
  collections,
  className
}: {
  tags: ProposePuzzleOutput['tags'];
  collections: ProposePuzzleOutput['collections'];
  className?: string;
}) {
  if (tags.length === 0 && collections.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {tags.map((tag) => (
        <span
          key={tag.slug}
          title={tag.is_new ? 'New tag — created when the puzzle is added' : 'Existing tag'}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            tag.is_new
              ? 'border-dashed border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-border bg-background text-muted-foreground'
          )}
        >
          <TagIcon className="size-3" />
          {tag.slug}
          {tag.is_new ? <span className="font-semibold">· new</span> : null}
        </span>
      ))}
      {collections.map((collection) => (
        <span
          key={collection.id}
          className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
        >
          <LayersIcon className="size-3" />
          {collection.title}
        </span>
      ))}
    </div>
  );
}

export function IssueList({ items, tone }: { items: string[]; tone: 'error' | 'warning' }) {
  if (items.length === 0) return null;
  return (
    <ul
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs',
        tone === 'error'
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
      )}
    >
      {items.map((item, index) => (
        <li key={index}>• {item}</li>
      ))}
    </ul>
  );
}
