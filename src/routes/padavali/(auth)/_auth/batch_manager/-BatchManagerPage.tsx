'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { useMemo, useState } from 'react';
import { Image } from '@unpic/react';
import { Link } from '@tanstack/react-router';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import { Spinner } from '~/components/ui/spinner';
import { Skeleton } from '~/components/ui/skeleton';
import { Checkbox } from '~/components/ui/checkbox';
import { getCDNUrl } from '~/constants';
import {
  PUZZLE_IMAGE_BATCH_STATUS_LABELS,
  PUZZLE_IMAGE_BATCH_STATUS_VARIANTS
} from '~/util/ai_batch/batch_image_status';
import { BatchPuzzleImageReviewDialog } from '~/components/pages/padavali/batch-image/BatchPuzzleImageReviewDialog';
import { useInvalidatePuzzleImageBatchQueries } from '~/components/pages/padavali/batch-image/usePuzzleImageBatchStatus';
import type { PuzzleImageGame } from '~/util/types/ai_batch_metadata';

type RouterOutput = inferRouterOutputs<AppRouter>;
type BatchManagerGroup = RouterOutput['batch_ai']['get_batch_manager_groups'][number];
type BatchManagerItem = BatchManagerGroup['items'][number];

type BatchManagerPageProps = {
  game?: PuzzleImageGame;
};

const BatchManagerPage = ({ game = 'padavali' }: BatchManagerPageProps) => {
  const { invalidateAll } = useInvalidatePuzzleImageBatchQueries(game);
  const [review_item, setReviewItem] = useState<BatchManagerItem | null>(null);
  const [poll_confirm_batch_id, setPollConfirmBatchId] = useState<string | null>(null);
  const [discard_confirm_item, setDiscardConfirmItem] = useState<BatchManagerItem | null>(null);
  const [discard_delete_image_asset, setDiscardDeleteImageAsset] = useState(false);

  const list_href = game === 'crossword' ? '/padajala/list' : '/padavali/list';
  const edit_href = (puzzle_id: number) =>
    game === 'crossword' ? `/padajala/edit/${puzzle_id}` : `/padavali/edit/${puzzle_id}`;
  const title = game === 'crossword' ? 'Crossword Batch Manager' : 'Batch Manager';

  const trpc = useTRPC();

  const groups_q = useQuery(
    trpc.batch_ai.get_batch_manager_groups.queryOptions(
      { game },
      {
        staleTime: 90_000,
        refetchOnWindowFocus: false
      }
    )
  );

  const poll_mut = useMutation(
    trpc.batch_ai.poll_batch_puzzle_image_gen.mutationOptions({
      onSuccess: async (data) => {
        await invalidateAll();
        toast.success(data.message || 'Batch polled successfully');
        setPollConfirmBatchId(null);
      },
      onError: (err) => toast.error(err.message || 'Failed to poll batch')
    })
  );

  const discard_mut = useMutation(
    trpc.batch_ai.discard_puzzle_image_batch_response.mutationOptions({
      onSuccess: async () => {
        await invalidateAll();
        toast.success('Batch item discarded');
        setDiscardConfirmItem(null);
        setDiscardDeleteImageAsset(false);
      },
      onError: (err) => toast.error(err.message || 'Failed to discard batch item')
    })
  );

  const groups = useMemo(() => groups_q.data ?? [], [groups_q.data]);
  const default_open = useMemo(() => groups.slice(0, 1).map((group) => group.batch_id), [groups]);

  const can_discard = (item: BatchManagerItem) =>
    item.status === 'processing' || item.status === 'ready_for_review' || item.status === 'failed';

  const isPollingBatch = (batch_id: string) =>
    poll_mut.isPending && poll_mut.variables?.batch_id === batch_id;

  const isDiscardingItem = (item: BatchManagerItem) =>
    discard_mut.isPending &&
    discard_mut.variables?.batch_id === item.batch_id &&
    discard_mut.variables?.custom_id === item.custom_id;

  const handleConfirmPoll = () => {
    if (!poll_confirm_batch_id || poll_mut.isPending) return;
    poll_mut.mutate({ batch_id: poll_confirm_batch_id });
  };

  const handleConfirmDiscard = () => {
    if (!discard_confirm_item || discard_mut.isPending) return;
    discard_mut.mutate({
      batch_id: discard_confirm_item.batch_id,
      custom_id: discard_confirm_item.custom_id,
      delete_image_asset: discard_delete_image_asset
    });
  };

  const openDiscardConfirm = (item: BatchManagerItem) => {
    setDiscardDeleteImageAsset(false);
    setDiscardConfirmItem(item);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
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
      ) : groups_q.isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <p className="font-medium text-destructive">Failed to load batch jobs</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {groups_q.error.message || 'Something went wrong while fetching batch groups.'}
          </p>
          <Button type="button" className="mt-4" onClick={() => void groups_q.refetch()}>
            Try again
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium">No active batch image jobs</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Queue background generation from the puzzle list or edit page.
          </p>
          <Button render={<Link to={list_href} />} nativeButton={false} className="mt-4">
            Go to puzzle list
          </Button>
        </div>
      ) : (
        <Accordion defaultValue={default_open} className="space-y-3">
          {groups.map((group) => {
            const polling_this = isPollingBatch(group.batch_id);
            return (
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
                      disabled={polling_this}
                      onClick={() => setPollConfirmBatchId(group.batch_id)}
                    >
                      {polling_this ? (
                        <Spinner className="size-4" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                      Poll now
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const discarding_this = isDiscardingItem(item);
                      return (
                        <div
                          key={`${item.batch_id}-${item.custom_id}`}
                          className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            {item.image_asset ? (
                              <Image
                                src={getCDNUrl(item.image_asset.s3_key)}
                                alt={
                                  item.puzzle_title
                                    ? `Generated preview for ${item.puzzle_title}`
                                    : 'Generated puzzle card preview'
                                }
                                width={64}
                                height={64}
                                className="size-16 shrink-0 rounded-md border border-border object-cover"
                              />
                            ) : (
                              <div className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                                {item.status === 'processing' ? (
                                  <Spinner className="size-4" />
                                ) : (
                                  'N/A'
                                )}
                              </div>
                            )}
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium">
                                  {item.puzzle_title ?? `Puzzle #${item.puzzle_id ?? '?'}`}
                                </p>
                                <Badge variant={PUZZLE_IMAGE_BATCH_STATUS_VARIANTS[item.status]}>
                                  {PUZZLE_IMAGE_BATCH_STATUS_LABELS[item.status]}
                                </Badge>
                                {item.auto_approved ? (
                                  <Badge variant="outline">Auto-apply</Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">{item.custom_id}</p>
                              {item.puzzle_id ? (
                                <Link
                                  to={edit_href(item.puzzle_id)}
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
                                disabled={discarding_this}
                                onClick={() => openDiscardConfirm(item)}
                              >
                                {discarding_this ? <Spinner className="size-4" /> : null}
                                Discard
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <AlertDialog
        open={poll_confirm_batch_id !== null}
        onOpenChange={(open) => {
          if (!open && !poll_mut.isPending) setPollConfirmBatchId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poll this batch now?</AlertDialogTitle>
            <AlertDialogDescription>
              This checks OpenAI for the latest results for batch{' '}
              <span className="font-mono text-foreground">{poll_confirm_batch_id}</span> and uploads
              any completed images. Other batches stay available while this runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={poll_mut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={poll_mut.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmPoll();
              }}
            >
              {poll_mut.isPending ? 'Polling…' : 'Poll now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={discard_confirm_item !== null}
        onOpenChange={(open) => {
          if (!open && !discard_mut.isPending) {
            setDiscardConfirmItem(null);
            setDiscardDeleteImageAsset(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this batch item?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{' '}
              <span className="font-medium text-foreground">
                {discard_confirm_item?.puzzle_title ??
                  `Puzzle #${discard_confirm_item?.puzzle_id ?? '?'}`}
              </span>{' '}
              from batch{' '}
              <span className="font-mono text-foreground">{discard_confirm_item?.batch_id}</span>.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {discard_confirm_item?.image_asset ? (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={discard_delete_image_asset}
                onCheckedChange={(checked) => setDiscardDeleteImageAsset(checked === true)}
                disabled={discard_mut.isPending}
                className="mt-0.5"
              />
              <span>
                Also delete the generated image asset from storage. Leave unchecked to keep the
                image file.
              </span>
            </label>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discard_mut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={discard_mut.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDiscard();
              }}
            >
              {discard_mut.isPending ? 'Discarding…' : 'Discard'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
