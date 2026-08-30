'use client';

import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { CheckIcon, Loader2Icon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react';
import { client, useTRPC } from '~/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { SlugRedirectConflictPrompt } from '~/components/pages/padavali/SlugRedirectConflictPrompt';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { cn } from '~/lib/utils';
import { isValidCrosswordSlug } from '~/util/puzzle/slug';

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

type SlugStatus = ReturnType<typeof useDebouncedSlugCheck>['status'];

const SlugRedirectNote = ({ currentSlug, normalizedSlug }: { currentSlug: string; normalizedSlug: string }) => (
  <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-900/50 dark:bg-sky-950/30">
    <Label
      id="edit-slug-redirect-note"
      className="text-xs font-medium text-sky-900 dark:text-sky-200"
    >
      Old URL stays valid
    </Label>
    <p className="mt-1 text-xs text-sky-800 dark:text-sky-300">
      After saving, <span className="font-mono font-semibold">{currentSlug}</span> will
      keep working and redirect visitors to{' '}
      <span className="font-mono font-semibold">{normalizedSlug}</span>.
    </p>
  </div>
);

const SlugStatusHint = ({
  status,
  slugChanged,
  normalizedSlug,
  currentSlug
}: {
  status: SlugStatus;
  slugChanged: boolean;
  normalizedSlug: string;
  currentSlug: string;
}) => (
  <p
    id="edit-slug-status"
    className={cn(
      'text-xs',
      status === 'taken' || status === 'invalid'
        ? 'text-red-600'
        : 'text-muted-foreground'
    )}
  >
    {status === 'invalid' &&
      'Only lowercase letters, numbers, underscores, and dashes are allowed.'}
    {status === 'taken' &&
      'This slug is already used by another puzzle and cannot be reused.'}
    {status === 'available' && slugChanged && `Available as "${normalizedSlug}".`}
    {status === 'available' && !slugChanged && 'Enter a different slug to continue.'}
    {status === 'redirect_conflict' &&
      `Slug "${normalizedSlug}" conflicts with an existing redirect. Confirm below to use it anyway — "${currentSlug}" will still redirect to "${normalizedSlug}" after saving.`}
  </p>
);

const SlugConflictSection = ({
  status,
  redirectConflict,
  overrideConfirmed,
  onOverrideChange
}: {
  status: SlugStatus;
  redirectConflict: ReturnType<typeof useDebouncedSlugCheck>['redirectConflict'];
  overrideConfirmed: boolean;
  onOverrideChange: (confirmed: boolean) => void;
}) => {
  if (status !== 'redirect_conflict' || !redirectConflict) return null;
  return (
    <SlugRedirectConflictPrompt
      conflict={redirectConflict}
      overrideConfirmed={overrideConfirmed}
      onOverrideChange={onOverrideChange}
    />
  );
};

export const EditCrosswordSlugDialog = ({ puzzleId, currentSlug, onSlugUpdated }: Props) => {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newSlug, setNewSlug] = useState(currentSlug);
  const [overrideForSlug, setOverrideForSlug] = useState<string | null>(null);

  const {
    status: slugStatus,
    normalizedSlug,
    redirectConflict
  } = useDebouncedSlugCheck(newSlug, {
    excludePuzzleId: puzzleId,
    enabled: open,
    checkSlug: (params) => client.crossword.check_slug_availability.query(params),
    isValidSlugFn: isValidCrosswordSlug
  });
  const overrideRedirectSlug = overrideForSlug === normalizedSlug;

  const update_slug_mut = useMutation(
    trpc.crossword.update_puzzle_slug.mutationOptions({
      onSuccess: async (data) => {
        toast.success('Slug updated successfully');

        void queryClient.invalidateQueries({ queryKey: ['crossword_list'] });
        void queryClient.invalidateQueries(
          trpc.crossword.get_puzzle_slugs.queryFilter({ puzzle_id: puzzleId })
        );
        await router.invalidate();

        onSlugUpdated(data.slug);
        setOpen(false);
        setConfirmOpen(false);
        setOverrideForSlug(null);
      },
      onError() {
        toast.error('Failed to update slug');
        setConfirmOpen(false);
      }
    })
  );

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
            setOverrideForSlug(null);
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
                onChange={(e) => {
                  setNewSlug(e.currentTarget.value);
                  setOverrideForSlug(null);
                }}
                className="pr-9"
                aria-describedby={
                  slugChanged ? 'edit-slug-redirect-note edit-slug-status' : 'edit-slug-status'
                }
              />
              <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
                <SlugStatusIcon status={slugStatus} />
              </div>
            </div>
            {slugChanged ? (
              <SlugRedirectNote currentSlug={currentSlug} normalizedSlug={normalizedSlug} />
            ) : null}
            <SlugStatusHint
              status={slugStatus}
              slugChanged={slugChanged}
              normalizedSlug={normalizedSlug}
              currentSlug={currentSlug}
            />
            <SlugConflictSection
              status={slugStatus}
              redirectConflict={redirectConflict}
              overrideConfirmed={overrideRedirectSlug}
              onOverrideChange={(confirmed) => setOverrideForSlug(confirmed ? normalizedSlug : null)}
            />
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
              <span className="mt-2 block text-muted-foreground">
                &quot;{currentSlug}&quot; will remain valid and redirect to &quot;{normalizedSlug}
                &quot;.
              </span>
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

export const CrosswordSlugField = ({
  slug,
  puzzleId,
  onSlugUpdated
}: {
  slug: string;
  puzzleId: number;
  onSlugUpdated: (slug: string) => void;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteSlugConfirm, setDeleteSlugConfirm] = useState<string | null>(null);

  const puzzle_slugs_q = useQuery(
    trpc.crossword.get_puzzle_slugs.queryOptions({ puzzle_id: puzzleId }, { enabled: puzzleId > 0 })
  );

  const delete_redirect_mut = useMutation(
    trpc.crossword.delete_redirect_slug.mutationOptions({
      onSuccess: async () => {
        toast.success('Redirect removed');
        setDeleteSlugConfirm(null);
        void queryClient.invalidateQueries(
          trpc.crossword.get_puzzle_slugs.queryFilter({ puzzle_id: puzzleId })
        );
        await router.invalidate();
      },
      onError() {
        toast.error('Failed to remove redirect');
        setDeleteSlugConfirm(null);
      }
    })
  );

  const all_slugs = puzzle_slugs_q.data?.all_slugs ?? [slug];
  const show_slug_aliases = all_slugs.length > 1;
  const isDeletingRedirect = delete_redirect_mut.isPending;

  const handleDeleteRedirect = () => {
    if (!deleteSlugConfirm) return;
    delete_redirect_mut.mutate({
      puzzle_id: puzzleId,
      redirect_slug: deleteSlugConfirm
    });
  };

  return (
    <div>
      <Label className="block font-medium">
        <span className="text-xl font-bold">Slug</span>
        <div className="mt-1 flex w-full max-w-md items-center gap-2">
          <Input type="text" className="text-lg font-semibold" value={slug} disabled readOnly />
          <EditCrosswordSlugDialog
            puzzleId={puzzleId}
            currentSlug={slug}
            onSlugUpdated={onSlugUpdated}
          />
        </div>
      </Label>
      {show_slug_aliases ? (
        <Accordion className="mt-2 max-w-md">
          <AccordionItem value="puzzle-slugs" className="rounded-md border px-3">
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
              All URLs for this puzzle ({all_slugs.length})
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1 rounded-md bg-muted/30 px-1 py-2 text-sm">
                {all_slugs.map((entry_slug) => {
                  const is_current = entry_slug === slug;

                  return (
                    <li key={entry_slug} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-xs sm:text-sm">
                        {entry_slug}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
                            is_current
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {is_current ? 'Current' : 'Redirect'}
                        </span>
                        {!is_current ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={isDeletingRedirect}
                            onClick={() => setDeleteSlugConfirm(entry_slug)}
                            aria-label={`Delete redirect ${entry_slug}`}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}

      <AlertDialog
        open={deleteSlugConfirm !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingRedirect) {
            setDeleteSlugConfirm(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete redirect slug?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove redirect &quot;{deleteSlugConfirm}&quot;? This old URL will stop working for
              this puzzle.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingRedirect}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingRedirect}
              onClick={handleDeleteRedirect}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeletingRedirect ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
