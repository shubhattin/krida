'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { ExternalLinkIcon, LayersIcon, PencilIcon, TagIcon } from 'lucide-react';
import { useTRPC } from '~/api/client';
import { buttonVariants } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import type { GameKind } from '~/util/catalog/tags';
import { type AdminPuzzleRow, puzzleEditPath, puzzleViewHref } from './puzzle_table_columns';

const chipClass =
  'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/70 px-2.5 py-0.5 text-xs hover:bg-muted';

function Section({
  icon,
  title,
  count,
  children
}: {
  icon?: ReactNode;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {title}
        {count !== undefined ? <span className="tabular-nums">({count})</span> : null}
      </h3>
      {children}
    </section>
  );
}

const None = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

export function PuzzleDetailsDialog({
  game,
  puzzle,
  open,
  onOpenChange
}: {
  game: GameKind;
  /** Last selected row; kept while closing so the exit animation has content. */
  puzzle: AdminPuzzleRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const details_q = useQuery({
    ...trpc.catalog.puzzle_details.queryOptions({ game, puzzle_id: puzzle?.id ?? 0 }),
    enabled: open && puzzle !== null
  });
  const details = details_q.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        {puzzle ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 text-lg">{puzzle.title}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-xs">{puzzle.slug}</span>
                <span aria-hidden>·</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    puzzle.listed
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-500/10 text-slate-500'
                  )}
                >
                  {puzzle.listed ? 'Listed' : 'Draft'}
                </span>
                <span aria-hidden>·</span>
                <span>Created {dayjs(puzzle.created_at).format('MMM D, YYYY')}</span>
                {puzzle.updated_at ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>Updated {dayjs(puzzle.updated_at).fromNow()}</span>
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4">
              {puzzle.description ? (
                <p className="text-sm text-muted-foreground">{puzzle.description}</p>
              ) : null}

              {details_q.isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-7 w-full" />
                  ))}
                </div>
              ) : details_q.isError ? (
                <None>Could not load puzzle details.</None>
              ) : details ? (
                <>
                  <Section title={details.label} count={details.entries.length}>
                    {details.entries.length === 0 ? (
                      <None>Nothing added yet.</None>
                    ) : (
                      <ol className="flex flex-col divide-y divide-border/60 rounded-lg border border-border/60">
                        {details.entries.map((entry, index) => (
                          <li
                            key={index}
                            className={cn(
                              'flex items-baseline gap-3 px-3 py-1.5 text-sm',
                              entry.inactive && 'opacity-55'
                            )}
                          >
                            <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="font-medium">{entry.text}</span>
                              {entry.detail ? (
                                <span className="text-muted-foreground"> — {entry.detail}</span>
                              ) : null}
                            </span>
                            {entry.inactive ? (
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                not added
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    )}
                  </Section>

                  <Section
                    icon={<TagIcon className="size-3.5" />}
                    title="Tags"
                    count={details.tags.length}
                  >
                    {details.tags.length === 0 ? (
                      <None>No tags.</None>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {details.tags.map((tag) => (
                          <Link
                            key={tag.id}
                            to="/tags/edit/$slug"
                            params={{ slug: tag.slug }}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={chipClass}
                          >
                            {tag.slug}
                          </Link>
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section
                    icon={<LayersIcon className="size-3.5" />}
                    title="Collections"
                    count={details.collections.length}
                  >
                    {details.collections.length === 0 ? (
                      <None>Not in any collection.</None>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {details.collections.map((collection) => (
                          <Link
                            key={collection.id}
                            to="/collections/edit/$uid"
                            params={{ uid: collection.uid }}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={chipClass}
                          >
                            {collection.title}
                            {collection.listed ? null : (
                              <span className="text-[10px] text-muted-foreground">(draft)</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </Section>
                </>
              ) : null}
            </div>

            <DialogFooter>
              <a
                href={puzzleViewHref(game, puzzle.uid)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                <ExternalLinkIcon />
                View
              </a>
              <Link
                to={puzzleEditPath(game)}
                params={{ id: String(puzzle.id) }}
                className={buttonVariants({ variant: 'default' })}
              >
                <PencilIcon />
                Edit
              </Link>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
