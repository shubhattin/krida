'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckIcon, Loader2Icon, PencilIcon, XIcon } from 'lucide-react';
import { client_q } from '~/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { invalidatePage } from '~/tools/invalidate_nextjs_server_route';
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
import { SlugRedirectConflictPrompt } from '~/components/pages/main/SlugRedirectConflictPrompt';
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
  const queryClient = useQueryClient();
  const utils = client_q.useUtils();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newSlug, setNewSlug] = useState(currentSlug);
  const [overrideRedirectSlug, setOverrideRedirectSlug] = useState(false);

  const {
    status: slugStatus,
    normalizedSlug,
    redirectConflict
  } = useDebouncedSlugCheck(newSlug, {
    excludePuzzleId: puzzleId,
    enabled: open
  });

  useEffect(() => {
    setOverrideRedirectSlug(false);
  }, [normalizedSlug]);

  const update_slug_mut = client_q.puzzle.update_puzzle_slug.useMutation({
    onSuccess(data) {
      toast.success('Slug updated successfully');

      void queryClient.invalidateQueries({ queryKey: ['listed_puzzles_carousel'] });
      void utils.puzzle.get_puzzle_slugs.invalidate({ puzzle_id: puzzleId });

      void invalidatePage('/padavali/puzzles');
      void invalidatePage(`/padavali/${currentSlug}`);
      void invalidatePage(`/padavali/${data.slug}`);

      onSlugUpdated(data.slug);
      setOpen(false);
      setConfirmOpen(false);
      setOverrideRedirectSlug(false);
      router.refresh();
    },
    onError() {
      toast.error('Failed to update slug');
      setConfirmOpen(false);
    }
  });

  const slugChanged = normalizedSlug !== currentSlug;
  const slugReady =
    slugStatus === 'available' || (slugStatus === 'redirect_conflict' && overrideRedirectSlug);
  const canSubmit = slugChanged && slugReady && normalizedSlug.length > 0;

  const handleConfirm = () => {
    update_slug_mut.mutate({
      puzzle_id: puzzleId,
      current_slug: currentSlug,
      new_slug: normalizedSlug,
      override_redirect_slug: slugStatus === 'redirect_conflict' && overrideRedirectSlug
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
            setOverrideRedirectSlug(false);
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
            <DialogDescription>Enter a new slug for this puzzle.</DialogDescription>
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
              {slugStatus === 'taken' &&
                'This slug is already used by another puzzle and cannot be reused.'}
              {slugStatus === 'available' && slugChanged && `Available as "${normalizedSlug}".`}
              {slugStatus === 'available' && !slugChanged && 'Enter a different slug to continue.'}
              {slugStatus === 'redirect_conflict' &&
                `Slug "${normalizedSlug}" conflicts with an existing redirect.`}
            </p>
            {slugStatus === 'redirect_conflict' && redirectConflict ? (
              <SlugRedirectConflictPrompt
                conflict={redirectConflict}
                overrideConfirmed={overrideRedirectSlug}
                onOverrideChange={setOverrideRedirectSlug}
              />
            ) : null}
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
              Change slug from &quot;{currentSlug}&quot; to &quot;{normalizedSlug}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={update_slug_mut.isPending} onClick={handleConfirm}>
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
  const puzzle_slugs_q = client_q.puzzle.get_puzzle_slugs.useQuery(
    { puzzle_id: puzzleId },
    { enabled: puzzleId > 0 }
  );

  const all_slugs = puzzle_slugs_q.data?.all_slugs ?? [slug];
  const show_slug_aliases = all_slugs.length > 1;

  return (
    <div>
      <Label className="block font-medium">
        <span className="text-xl font-bold">Slug</span>
        <div className="mt-1 flex w-full max-w-md items-center gap-2">
          <Input type="text" className="text-lg font-semibold" value={slug} disabled readOnly />
          <EditSlugDialog puzzleId={puzzleId} currentSlug={slug} onSlugUpdated={onSlugUpdated} />
        </div>
      </Label>
      {show_slug_aliases ? (
        <div className="mt-2 max-w-md space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">All URLs for this puzzle</p>
          <ul className="space-y-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            {all_slugs.map((entry_slug) => (
              <li key={entry_slug} className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs sm:text-sm">{entry_slug}</span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                    entry_slug === slug
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {entry_slug === slug ? 'Current' : 'Redirect'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
