'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { client_q } from '~/api/client';
import { getCDNUrl } from '~/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { useInvalidatePuzzleImageBatchQueries } from './usePuzzleImageBatchStatus';
import type { PuzzleImageBatchStatus } from './BatchPuzzleImageStatus';

const IMAGE_ASPECT = '3 / 2';

export type BatchImageInfo = {
  id: number;
  s3_key: string;
  width: number;
  height: number;
};

type BatchPuzzleImageReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchStatus: PuzzleImageBatchStatus;
  onApproved?: (info: BatchImageInfo) => void;
  onDiscarded?: () => void;
};

export function BatchPuzzleImageReviewDialog({
  open,
  onOpenChange,
  batchStatus,
  onApproved,
  onDiscarded
}: BatchPuzzleImageReviewDialogProps) {
  const { invalidateAll } = useInvalidatePuzzleImageBatchQueries();
  const [discard_open, setDiscardOpen] = useState(false);

  const approve_mut = client_q.batch_ai.approve_puzzle_image.useMutation({
    onSuccess: async (data) => {
      const asset = batchStatus.image_asset;
      if (asset && onApproved) {
        onApproved({
          id: data.uploaded_image_id,
          s3_key: asset.s3_key,
          width: asset.width,
          height: asset.height
        });
      }
      await invalidateAll(batchStatus.puzzle_id ?? undefined);
      toast.success('Generated image applied to puzzle');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to approve generated image');
    }
  });

  const discard_mut = client_q.batch_ai.discard_puzzle_image_batch_response.useMutation({
    onSuccess: async () => {
      await invalidateAll(batchStatus.puzzle_id ?? undefined);
      toast.success('Generated image discarded');
      setDiscardOpen(false);
      onOpenChange(false);
      onDiscarded?.();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to discard generated image');
    }
  });

  const image_asset = batchStatus.image_asset;
  const is_working = approve_mut.isPending || discard_mut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        showCloseButton={!is_working}
      >
        <DialogHeader>
          <DialogTitle>Review generated image</DialogTitle>
          <DialogDescription>
            {batchStatus.puzzle_title
              ? `Puzzle: ${batchStatus.puzzle_title}`
              : batchStatus.puzzle_id
                ? `Puzzle #${batchStatus.puzzle_id}`
                : 'Review the batch-generated image before applying it to the puzzle.'}
          </DialogDescription>
        </DialogHeader>

        {image_asset ? (
          <div className="overflow-hidden rounded-lg border border-border shadow-sm">
            <img
              src={getCDNUrl(image_asset.s3_key)}
              alt="Generated puzzle card preview"
              className="block w-full object-cover"
              style={{ aspectRatio: IMAGE_ASPECT }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No preview available for this batch item.</p>
        )}

        {batchStatus.metadata.image_description ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold">Image description</p>
            <p className="text-sm text-muted-foreground">
              {batchStatus.metadata.image_description}
            </p>
          </div>
        ) : null}

        {batchStatus.metadata.image_prompt ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold">Image prompt</p>
            <p className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
              {batchStatus.metadata.image_prompt}
            </p>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <AlertDialog open={discard_open} onOpenChange={setDiscardOpen}>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="outline" disabled={is_working}>
                  Discard
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard generated image?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the batch result and deletes the generated image asset if one was
                  uploaded.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={discard_mut.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={discard_mut.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    discard_mut.mutate({
                      batch_id: batchStatus.batch_id,
                      custom_id: batchStatus.custom_id
                    });
                  }}
                >
                  Discard
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            type="button"
            disabled={is_working || !image_asset}
            onClick={() =>
              approve_mut.mutate({
                batch_id: batchStatus.batch_id,
                custom_id: batchStatus.custom_id
              })
            }
          >
            Approve and apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
