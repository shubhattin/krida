'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, Loader2Icon, PencilIcon, XIcon } from 'lucide-react';
import { client_q } from '~/api/client';
import { Button } from '~/components/ui/button';
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
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { toast } from 'sonner';
import { useDebouncedSlugCheck } from '~/hooks/useDebouncedSlugCheck';
import { cn } from '~/lib/utils';

type Props = {
  puzzleId: number;
  currentSlug: string;
  onSlugUpdated: (slug: string) => void;
};

const SlugStatusIcon = ({
  status
}: {
  status: ReturnType<typeof useDebouncedSlugCheck>['status'];
}) => {
  if (status === 'checking') {
    return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />;
  }
  if (status === 'available') {
    return <CheckIcon className="size-4 text-green-600" />;
  }
  if (status === 'taken' || status === 'invalid') {
    return <XIcon className="size-4 text-red-600" />;
  }
  return null;
};

export const EditSlugDialog = ({ puzzleId, currentSlug, onSlugUpdated }: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newSlug, setNewSlug] = useState(currentSlug);

  const { status: slugStatus, normalizedSlug } = useDebouncedSlugCheck(newSlug, {
    excludePuzzleId: puzzleId,
    enabled: open
  });

  const update_slug_mut = client_q.puzzle.update_puzzle_slug.useMutation({
    onSuccess(data) {
      toast.success('Slug updated successfully');
      onSlugUpdated(data.slug);
      setOpen(false);
      setConfirmOpen(false);
      router.refresh();
    },
    onError() {
      toast.error('Failed to update slug');
      setConfirmOpen(false);
    }
  });

  const slugChanged = normalizedSlug !== currentSlug;
  const canSubmit = slugChanged && slugStatus === 'available' && normalizedSlug.length > 0;

  const handleConfirm = async () => {
    await update_slug_mut.mutateAsync({
      puzzle_id: puzzleId,
      current_slug: currentSlug,
      new_slug: normalizedSlug
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setConfirmOpen(false);
            setNewSlug(currentSlug);
          } else {
            setNewSlug(currentSlug);
          }
        }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          <PencilIcon className="size-4" />
          Edit
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Slug</DialogTitle>
            <DialogDescription className="text-amber-700 dark:text-amber-400">
              Warning: Changing the slug will invalidate any previous links to this puzzle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-puzzle-slug">New slug</Label>
            <div className="relative">
              <Input
                id="edit-puzzle-slug"
                value={newSlug}
                onChange={(e) => setNewSlug(e.currentTarget.value)}
                className="pr-9"
              />
              <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
                <SlugStatusIcon status={slugStatus} />
              </div>
            </div>
            <p
              className={cn(
                'text-xs',
                slugStatus === 'taken' || slugStatus === 'invalid'
                  ? 'text-red-600'
                  : 'text-muted-foreground'
              )}
            >
              {slugStatus === 'invalid' &&
                'Only lowercase letters, numbers, underscores, and dashes are allowed.'}
              {slugStatus === 'taken' && 'This slug is already taken.'}
              {slugStatus === 'available' && slugChanged && `Available as "${normalizedSlug}".`}
              {slugStatus === 'available' && !slugChanged && 'Enter a different slug to continue.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || update_slug_mut.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {update_slug_mut.isPending ? 'Saving...' : 'Save slug'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm slug change</AlertDialogTitle>
            <AlertDialogDescription>
              Change slug from &quot;{currentSlug}&quot; to &quot;{normalizedSlug}&quot;? Previous
              links will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={update_slug_mut.isPending}
              onClick={() => void handleConfirm()}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const SlugField = ({
  slug,
  puzzleId,
  onSlugUpdated
}: {
  slug: string;
  puzzleId: number;
  onSlugUpdated: (slug: string) => void;
}) => {
  return (
    <div>
      <Label className="block font-medium">
        <span className="text-xl font-bold">Slug</span>
        <div className="mt-1 flex w-full max-w-md items-center gap-2">
          <Input type="text" className="text-lg font-semibold" value={slug} disabled readOnly />
          <EditSlugDialog puzzleId={puzzleId} currentSlug={slug} onSlugUpdated={onSlugUpdated} />
        </div>
      </Label>
    </div>
  );
};
