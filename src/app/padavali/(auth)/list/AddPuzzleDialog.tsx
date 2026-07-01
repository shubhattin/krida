'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoMdAdd } from 'react-icons/io';
import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { client_q } from '~/api/client';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';
import { useDebouncedSlugCheck } from '~/hooks/useDebouncedSlugCheck';
import { SlugRedirectConflictPrompt } from '~/components/pages/main/SlugRedirectConflictPrompt';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';

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

const AddPuzzleDialog = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(true);
  const [overrideRedirectSlug, setOverrideRedirectSlug] = useState(false);

  const ctx = createTypingContext('Devanagari');
  useEffect(() => {
    ctx.ready;
  }, [ctx]);

  const {
    status: slugStatus,
    normalizedSlug,
    redirectConflict
  } = useDebouncedSlugCheck(slug, {
    enabled: open
  });

  useEffect(() => {
    setOverrideRedirectSlug(false);
  }, [normalizedSlug]);

  const add_puzzle_mut = client_q.puzzle.add_puzzle.useMutation({
    onSuccess(data) {
      toast.success('Puzzle added successfully');
      setOpen(false);
      setConfirmOpen(false);
      setTitle('');
      setDescription('');
      setSlug('');
      setOverrideRedirectSlug(false);
      router.push(`/padavali/edit/${data.id}`);
    },
    onError() {
      toast.error('Failed to add puzzle');
      setConfirmOpen(false);
    }
  });

  const slugReady =
    slugStatus === 'available' || (slugStatus === 'redirect_conflict' && overrideRedirectSlug);

  const canSubmit = title.trim().length > 0 && slugReady && normalizedSlug.length > 0;

  const handleConfirmAdd = () => {
    add_puzzle_mut.mutate({
      title: title.trim(),
      slug: normalizedSlug,
      description: description.trim() ? description.trim() : null,
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
            setTitle('');
            setDescription('');
            setSlug('');
            setOverrideRedirectSlug(false);
          }
        }}
      >
        <DialogTrigger
          render={
            <Button variant="outline" className="gap-2 font-semibold">
              <IoMdAdd className="size-5.5" /> Add New Puzzle
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Puzzle</DialogTitle>
            <DialogDescription>
              Enter a title and slug. You can fill in words and grid on the edit page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-puzzle-title">Title</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="add-puzzle-title"
                  className="flex-1"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  onBeforeInput={(e) =>
                    handleTypingBeforeInputEvent(
                      ctx,
                      e,
                      (newValue) => setTitle(newValue),
                      lipi_lekhika_typing
                    )
                  }
                  onBlur={() => ctx.clearContext()}
                  onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
                  placeholder="Puzzle title"
                />
                <Label className="inline-flex shrink-0 items-center justify-center gap-2 font-medium">
                  <Switch
                    checked={lipi_lekhika_typing}
                    onCheckedChange={setLipiLekhikaTyping}
                    className="-mt-1"
                  />
                  <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-puzzle-slug">Slug</Label>
              <div className="relative">
                <Input
                  id="add-puzzle-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.currentTarget.value)}
                  placeholder="my-puzzle-slug"
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
                {slugStatus === 'available' && `Available as "${normalizedSlug}".`}
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
            <div className="space-y-2">
              <Label htmlFor="add-puzzle-description">Description (optional)</Label>
              <Textarea
                id="add-puzzle-description"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                placeholder="Leave blank to fill later"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || add_puzzle_mut.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {add_puzzle_mut.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Add</AlertDialogTitle>
            <AlertDialogDescription>
              Create puzzle &quot;{title.trim()}&quot; with slug &quot;{normalizedSlug}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={add_puzzle_mut.isPending} onClick={handleConfirmAdd}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddPuzzleDialog;
