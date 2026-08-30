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

function batchManagerLinks(game: PuzzleImageGame) {
  return {
    list_href: game === 'crossword' ? '/padajala/list' : '/padavali/list',
    edit_href: (puzzle_id: number) =>
      game === 'crossword' ? `/padajala/edit/${puzzle_id}` : `/padavali/edit/${puzzle_id}`,
    title: game === 'crossword' ? 'Crossword Batch Manager' : 'Batch Manager'
  };
}

function useBatchManagerMutations(
  game: PuzzleImageGame,
  onPollDone: () => void,
  onDiscardDone: () => void
) {
  const { invalidateAll } = useInvalidatePuzzleImageBatchQueries(game);
  const trpc = useTRPC();

  const poll_mut = useMutation(
    trpc.batch_ai.poll_batch_puzzle_image_gen.mutationOptions({
      onSuccess: async (data) => {
        await invalidateAll();
        toast.success(data.message || 'Batch polled successfully');
        onPollDone();
      },
      onError: (err) => toast.error(err.message || 'Failed to poll batch')
    })
  );

  const discard_mut = useMutation(
    trpc.batch_ai.discard_puzzle_image_batch_response.mutationOptions({
      onSuccess: async () => {
        await invalidateAll();
        toast.success('Batch item discarded');
        onDiscardDone();
      },
      onError: (err) => toast.error(err.message || 'Failed to discard batch item')
    })
  );

  return { poll_mut, discard_mut };
}

type BatchManagerMutations = ReturnType<typeof useBatchManagerMutations>;
type PollMutation = BatchManagerMutations['poll_mut'];
type DiscardMutation = BatchManagerMutations['discard_mut'];

function canDiscard(item: BatchManagerItem): boolean {
  return (
    item.status === 'processing' || item.status === 'ready_for_review' || item.status === 'failed'
  );
}

function isPollingBatchOf(poll_mut: PollMutation, batch_id: string): boolean {
  return poll_mut.isPending && poll_mut.variables?.batch_id === batch_id;
}

function isDiscardingItemOf(discard_mut: DiscardMutation, item: BatchManagerItem): boolean {
  return (
    discard_mut.isPending &&
    discard_mut.variables?.batch_id === item.batch_id &&
    discard_mut.variables?.custom_id === item.custom_id
  );
}

const BatchGroupsStatus = ({
  isLoading,
  isError,
  error,
  isEmpty,
  list_href,
  onRetry
}: {
  isLoading: boolean;
  isError: boolean;
  error: string;
  isEmpty: boolean;
  list_href: string;
  onRetry: () => void;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
        <p className="font-medium text-destructive">Failed to load batch jobs</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error || 'Something went wrong while fetching batch groups.'}
        </p>
        <Button type="button" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-medium">No active batch image jobs</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Queue background generation from the puzzle list or edit page.
        </p>
        <Button render={<Link to={list_href} />} nativeButton={false} className="mt-4">
          Go to puzzle list
        </Button>
      </div>
    );
  }
  return null;
};

const BatchItemRow = ({
  item,
  discardMut,
  edit_href,
  onReview,
  onDiscard
}: {
  item: BatchManagerItem;
  discardMut: DiscardMutation;
  edit_href: (puzzle_id: number) => string;
  onReview: (item: BatchManagerItem) => void;
  onDiscard: (item: BatchManagerItem) => void;
}) => {
  const discarding_this = isDiscardingItemOf(discardMut, item);

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
            {item.status === 'processing' ? <Spinner className="size-4" /> : 'N/A'}
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
            {item.auto_approved ? <Badge variant="outline">Auto-apply</Badge> : null}
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
          <Button type="button" size="sm" onClick={() => onReview(item)}>
            Review
          </Button>
        ) : null}
        {canDiscard(item) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={discarding_this}
            onClick={() => onDiscard(item)}
          >
            {discarding_this ? <Spinner className="size-4" /> : null}
            Discard
          </Button>
        ) : null}
      </div>
    </div>
  );
};

const BatchGroupAccordion = ({
  groups,
  default_open,
  pollMut,
  discardMut,
  edit_href,
  onPoll,
  onReview,
  onDiscard
}: {
  groups: BatchManagerGroup[];
  default_open: string[];
  pollMut: PollMutation;
  discardMut: DiscardMutation;
  edit_href: (puzzle_id: number) => string;
  onPoll: (batch_id: string) => void;
  onReview: (item: BatchManagerItem) => void;
  onDiscard: (item: BatchManagerItem) => void;
}) => (
  <Accordion defaultValue={default_open} className="space-y-3">
    {groups.map((group) => {
      const polling_this = isPollingBatchOf(pollMut, group.batch_id);
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
                onClick={() => onPoll(group.batch_id)}
              >
                {polling_this ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
                Poll now
              </Button>
            </div>

            <div className="space-y-3">
              {group.items.map((item) => (
                <BatchItemRow
                  key={`${item.batch_id}-${item.custom_id}`}
                  item={item}
                  discardMut={discardMut}
                  edit_href={edit_href}
                  onReview={onReview}
                  onDiscard={onDiscard}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      );
    })}
  </Accordion>
);

const PollConfirmDialog = ({
  batch_id,
  mut,
  onDismiss
}: {
  batch_id: string | null;
  mut: PollMutation;
  onDismiss: () => void;
}) => (
  <AlertDialog
    open={batch_id !== null}
    onOpenChange={(open) => {
      if (!open && !mut.isPending) onDismiss();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Poll this batch now?</AlertDialogTitle>
        <AlertDialogDescription>
          This checks OpenAI for the latest results for batch{' '}
          <span className="font-mono text-foreground">{batch_id}</span> and uploads any completed
          images. Other batches stay available while this runs.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={mut.isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={mut.isPending}
          onClick={(e) => {
            e.preventDefault();
            if (!batch_id || mut.isPending) return;
            mut.mutate({ batch_id });
          }}
        >
          {mut.isPending ? 'Polling…' : 'Poll now'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const DiscardConfirmDialog = ({
  item,
  mut,
  delete_image_asset,
  onDeleteImageAssetChange,
  onDismiss
}: {
  item: BatchManagerItem | null;
  mut: DiscardMutation;
  delete_image_asset: boolean;
  onDeleteImageAssetChange: (checked: boolean) => void;
  onDismiss: () => void;
}) => (
  <AlertDialog
    open={item !== null}
    onOpenChange={(open) => {
      if (!open && !mut.isPending) onDismiss();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Discard this batch item?</AlertDialogTitle>
        <AlertDialogDescription>
          Remove{' '}
          <span className="font-medium text-foreground">
            {item?.puzzle_title ?? `Puzzle #${item?.puzzle_id ?? '?'}`}
          </span>{' '}
          from batch <span className="font-mono text-foreground">{item?.batch_id}</span>. This
          cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {item?.image_asset ? (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={delete_image_asset}
            onCheckedChange={onDeleteImageAssetChange}
            disabled={mut.isPending}
            className="mt-0.5"
          />
          <span>
            Also delete the generated image asset from storage. Leave unchecked to keep the image
            file.
          </span>
        </label>
      ) : null}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={mut.isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          disabled={mut.isPending}
          onClick={(e) => {
            e.preventDefault();
            if (!item || mut.isPending) return;
            mut.mutate({
              batch_id: item.batch_id,
              custom_id: item.custom_id,
              delete_image_asset
            });
          }}
        >
          {mut.isPending ? 'Discarding…' : 'Discard'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const ReviewDialog = ({
  item,
  onDismiss
}: {
  item: BatchManagerItem | null;
  onDismiss: () => void;
}) => {
  if (!item) return null;
  return (
    <BatchPuzzleImageReviewDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
      batchStatus={item}
      onApproved={onDismiss}
      onDiscarded={onDismiss}
    />
  );
};

const BatchManagerPage = ({ game = 'padavali' }: BatchManagerPageProps) => {
  const [review_item, setReviewItem] = useState<BatchManagerItem | null>(null);
  const [poll_confirm_batch_id, setPollConfirmBatchId] = useState<string | null>(null);
  const [discard_confirm_item, setDiscardConfirmItem] = useState<BatchManagerItem | null>(null);
  const [discard_delete_image_asset, setDiscardDeleteImageAsset] = useState(false);

  const { list_href, edit_href, title } = batchManagerLinks(game);

  const { poll_mut, discard_mut } = useBatchManagerMutations(
    game,
    () => setPollConfirmBatchId(null),
    () => {
      setDiscardConfirmItem(null);
      setDiscardDeleteImageAsset(false);
    }
  );

  const groups_q = useQuery(
    useTRPC().batch_ai.get_batch_manager_groups.queryOptions(
      { game },
      {
        staleTime: 90_000,
        refetchOnWindowFocus: false
      }
    )
  );

  const groups = useMemo(() => groups_q.data ?? [], [groups_q.data]);
  const default_open = useMemo(() => groups.slice(0, 1).map((group) => group.batch_id), [groups]);

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

      <BatchGroupsStatus
        isLoading={groups_q.isLoading}
        isError={groups_q.isError}
        error={groups_q.error?.message ?? ''}
        isEmpty={groups.length === 0}
        list_href={list_href}
        onRetry={() => void groups_q.refetch()}
      />

      {groups_q.isLoading || groups_q.isError || groups.length === 0 ? null : (
        <BatchGroupAccordion
          groups={groups}
          default_open={default_open}
          pollMut={poll_mut}
          discardMut={discard_mut}
          edit_href={edit_href}
          onPoll={setPollConfirmBatchId}
          onReview={setReviewItem}
          onDiscard={openDiscardConfirm}
        />
      )}

      <PollConfirmDialog
        batch_id={poll_confirm_batch_id}
        mut={poll_mut}
        onDismiss={() => setPollConfirmBatchId(null)}
      />

      <DiscardConfirmDialog
        item={discard_confirm_item}
        mut={discard_mut}
        delete_image_asset={discard_delete_image_asset}
        onDeleteImageAssetChange={(checked) => setDiscardDeleteImageAsset(checked === true)}
        onDismiss={() => {
          setDiscardConfirmItem(null);
          setDiscardDeleteImageAsset(false);
        }}
      />

      <ReviewDialog item={review_item} onDismiss={() => setReviewItem(null)} />
    </div>
  );

  function openDiscardConfirm(item: BatchManagerItem) {
    setDiscardDeleteImageAsset(false);
    setDiscardConfirmItem(item);
  }
};

export default BatchManagerPage;
