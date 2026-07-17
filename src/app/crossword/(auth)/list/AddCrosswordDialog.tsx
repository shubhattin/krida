'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoMdAdd } from 'react-icons/io';
import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { client, client_q } from '~/api/client';
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
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';
import { useDebouncedSlugCheck } from '~/hooks/useDebouncedSlugCheck';
import { SlugRedirectConflictPrompt } from '~/components/pages/padavali/SlugRedirectConflictPrompt';
import { cn } from '~/lib/utils';
import {
  CROSSWORD_DEFAULT_DIM,
  CROSSWORD_MAX_DIM,
  CROSSWORD_MIN_DIM,
  clampDimension
} from '~/util/cross_word/grid';
import { isValidCrosswordSlug } from '~/util/puzzle/slug';

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

const AddCrosswordDialog = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [overrideRedirectSlug, setOverrideRedirectSlug] = useState(false);
  const [rows, setRows] = useState(CROSSWORD_DEFAULT_DIM[0]);
  const [cols, setCols] = useState(CROSSWORD_DEFAULT_DIM[1]);

  const {
    status: slugStatus,
    normalizedSlug,
    redirectConflict
  } = useDebouncedSlugCheck(slug, {
    enabled: open,
    checkSlug: (params) => client.crossword.check_slug_availability.query(params),
    isValidSlugFn: isValidCrosswordSlug
  });

  useEffect(() => {
    setOverrideRedirectSlug(false);
  }, [normalizedSlug]);

  const add_mut = client_q.crossword.add_puzzle.useMutation({
    onSuccess(data) {
      toast.success('Puzzle added successfully');
      setOpen(false);
      setConfirmOpen(false);
      resetForm();
      router.push(`/crossword/edit/${data.id}`);
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
    add_mut.mutate({
      title: title.trim(),
      slug: normalizedSlug,
      description: description.trim() ? description.trim() : null,
      grid_dimensions: [clampDimension(rows), clampDimension(cols)],
      override_redirect_slug: slugStatus === 'redirect_conflict' && overrideRedirectSlug
    });
  };

  const resetForm = () => {
    setConfirmOpen(false);
    setTitle('');
    setDescription('');
    setSlug('');
    setOverrideRedirectSlug(false);
    setRows(CROSSWORD_DEFAULT_DIM[0]);
    setCols(CROSSWORD_DEFAULT_DIM[1]);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
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
            <DialogTitle>Add New Crossword</DialogTitle>
            <DialogDescription>
              Enter a title, slug, and grid size. You can fill words and the grid on the edit page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-crossword-title">Title</Label>
              <Input
                id="add-crossword-title"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                placeholder="Puzzle title"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-crossword-slug">Slug</Label>
              <div className="relative">
                <Input
                  id="add-crossword-slug"
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-crossword-description">Description (optional)</Label>
              <Textarea
                id="add-crossword-description"
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                placeholder="Leave blank to fill later"
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Grid size (rows × columns)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={CROSSWORD_MIN_DIM}
                  max={CROSSWORD_MAX_DIM}
                  value={rows}
                  onChange={(e) => setRows(Number(e.currentTarget.value) || CROSSWORD_MIN_DIM)}
                  className="w-20"
                  aria-label="Rows"
                />
                <span className="text-muted-foreground">×</span>
                <Input
                  type="number"
                  min={CROSSWORD_MIN_DIM}
                  max={CROSSWORD_MAX_DIM}
                  value={cols}
                  onChange={(e) => setCols(Number(e.currentTarget.value) || CROSSWORD_MIN_DIM)}
                  className="w-20"
                  aria-label="Columns"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Changing the grid size later clears the grid and you will need to re-enter letters.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit || add_mut.isPending} onClick={() => setConfirmOpen(true)}>
              {add_mut.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Add</AlertDialogTitle>
            <AlertDialogDescription>
              Create puzzle &quot;{title.trim()}&quot; with slug &quot;{normalizedSlug}&quot; as a{' '}
              {clampDimension(rows)}×{clampDimension(cols)} grid?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={add_mut.isPending} onClick={handleConfirmAdd}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddCrosswordDialog;
