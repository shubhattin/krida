'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { client_q } from '~/api/client';
import type { AppRouter } from '~/api/trpc_router';
import type { inferRouterOutputs } from '@trpc/server';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { Spinner } from '~/components/ui/spinner';
import { Skeleton } from '~/components/ui/skeleton';
import { getCDNUrl } from '~/constants';
import { BatchPuzzleImageReviewDialog } from '~/components/pages/main/batch-image/BatchPuzzleImageReviewDialog';
import { useInvalidatePuzzleImageBatchQueries } from '~/components/pages/main/batch-image/usePuzzleImageBatchStatus';

type RouterOutput = inferRouterOutputs<AppRouter>;
type BatchManagerGroup = RouterOutput['batch_ai']['get_batch_manager_groups'][number];
type BatchManagerItem = BatchManagerGroup['items'][number];

const status_label: Record<BatchManagerItem['status'], string> = {
  processing: 'Pending',
  ready_for_review: 'Ready',
  failed: 'Failed'
};

const status_variant: Record<BatchManagerItem['status'], 'secondary' | 'default' | 'destructive'> =
  {
    processing: 'secondary',
    ready_for_review: 'default',
    failed: 'destructive'
  };

const BatchManagerPage = () => {
  const { invalidateAll } = useInvalidatePuzzleImageBatchQueries();
  const [review_item, setReviewItem] = useState<BatchManagerItem | null>(null);

  const groups_q = client_q.batch_ai.get_batch_manager_groups.useQuery(undefined, {
    staleTime: 90_000,
    refetchOnWindowFocus: false
  });

  const poll_mut = client_q.batch_ai.poll_batch_puzzle_image_gen.useMutation({
    onSuccess: async (data) => {
      await invalidateAll();
      toast.success(data.message || 'Batch polled successfully');
    },
    onError: (err) => toast.error(err.message || 'Failed to poll batch')
  });

  const discard_mut = client_q.batch_ai.discard_puzzle_image_batch_response.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      toast.success('Batch item discarded');
    },
    onError: (err) => toast.error(err.message || 'Failed to discard batch item')
  });

  const groups = groups_q.data ?? [];
  const default_open = useMemo(() => groups.slice(0, 1).map((group) => group.batch_id), [groups]);

  const can_discard = (item: BatchManagerItem) =>
    item.status === 'processing' || item.status === 'ready_for_review' || item.status === 'failed';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Batch Manager</h1>
          <p className="text-sm text-muted-foreground">
            Monitor background puzzle image batches, poll for results, and review generated images.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={groups_q.isFetching}
          onClick={() => void groups_q.refetch()}
        >
          <RefreshCw className={groups_q.isFetching ? 'size-4 animate-spin' : 'size-4'} />
          Refresh
        </Button>
      </div>

      {groups_q.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">No active batch image jobs</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Queue background generation from the puzzle list or edit page.
          </p>
          <Button render={<Link href="/padavali/list" />} nativeButton={false} className="mt-4">
            Go to puzzle list
          </Button>
        </div>
      ) : (
        <Accordion defaultValue={default_open} className="space-y-3">
          {groups.map((group) => (
            <AccordionItem
              key={group.batch_id}
              value={group.batch_id}
              className="rounded-xl border border-border px-4"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex w-full flex-col gap-2 pr-2 text-left sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">Batch {group.batch_id}</p>
                    <p className="text-xs text-muted-foreground">{group.items.length} item(s)</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Pending {group.counts.pending}</Badge>
                    <Badge>Ready {group.counts.ready}</Badge>
                    <Badge variant="destructive">Failed {group.counts.failed}</Badge>
                    {group.counts.auto_approved > 0 ? (
                      <Badge variant="outline">Auto-apply {group.counts.auto_approved}</Badge>
                    ) : null}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={poll_mut.isPending}
                    onClick={() => poll_mut.mutate({ batch_id: group.batch_id })}
                  >
                    {poll_mut.isPending && poll_mut.variables?.batch_id === group.batch_id ? (
                      <Spinner className="size-4" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Poll now
                  </Button>
                </div>

                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={`${item.batch_id}-${item.custom_id}`}
                      className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {item.image_asset ? (
                          <img
                            src={getCDNUrl(item.image_asset.s3_key)}
                            alt=""
                            className="size-16 shrink-0 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                            {item.status === 'processing' ? <Spinner className="size-4" /> : 'N/A'}
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium">
                              {item.puzzle_title ?? `Puzzle #${item.puzzle_id ?? '?'}`}
                            </p>
                            <Badge variant={status_variant[item.status]}>
                              {status_label[item.status]}
                            </Badge>
                            {item.auto_approved ? (
                              <Badge variant="outline">Auto-apply</Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.custom_id}</p>
                          {item.puzzle_id ? (
                            <Link
                              href={`/padavali/edit/${item.puzzle_id}`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Open puzzle
                              <ExternalLink className="size-3" />
                            </Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.status === 'ready_for_review' ? (
                          <Button type="button" size="sm" onClick={() => setReviewItem(item)}>
                            Review
                          </Button>
                        ) : null}
                        {can_discard(item) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={discard_mut.isPending}
                            onClick={() =>
                              discard_mut.mutate({
                                batch_id: item.batch_id,
                                custom_id: item.custom_id
                              })
                            }
                          >
                            Discard
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {review_item ? (
        <BatchPuzzleImageReviewDialog
          open={review_item !== null}
          onOpenChange={(open) => {
            if (!open) setReviewItem(null);
          }}
          batchStatus={review_item}
          onApproved={() => setReviewItem(null)}
          onDiscarded={() => setReviewItem(null)}
        />
      ) : null}
    </div>
  );
};

export default BatchManagerPage;
