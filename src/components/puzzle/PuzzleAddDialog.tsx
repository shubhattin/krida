'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { IoMdAdd } from 'react-icons/io';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { toast } from 'sonner';
import { SlugRedirectConflictPrompt } from '~/components/pages/padavali/SlugRedirectConflictPrompt';
import { isLipiToggleKey, LipiLekhikaSwitch } from '~/components/puzzle/LipiLekhikaSwitch';
import { SlugStatusHint, SlugStatusIcon } from '~/components/puzzle/SlugStatus';
import { Button } from '~/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { useDebouncedSlugCheck, type SlugCheckFn } from '~/hooks/useDebouncedSlugCheck';
import { cn } from '~/lib/utils';
import { isValidSlug } from '~/util/puzzle/slug';

export type PuzzleCreateFields = {
  title: string;
  slug: string;
  description: string;
  override_redirect_slug: boolean;
};

export function PuzzleAddDialog({
  triggerLabel,
  triggerClassName,
  triggerVariant = 'outline',
  dialogTitle,
  dialogDescription,
  confirmTitle = 'Create this puzzle?',
  confirmDescription,
  lipi = false,
  checkSlug,
  isValidSlugFn = isValidSlug,
  extraFields,
  onCreate,
  onCreated,
  onClose
}: {
  triggerLabel: string;
  triggerClassName?: string;
  triggerVariant?: 'default' | 'outline';
  dialogTitle: string;
  dialogDescription: string;
  confirmTitle?: string;
  confirmDescription?: (fields: { title: string; slug: string }) => string;
  /** Admin editors may turn Lipi Lekhika on; omit to hide the switch. */
  lipi?: boolean;
  checkSlug: SlugCheckFn;
  isValidSlugFn?: (slug: string) => boolean;
  extraFields?: ReactNode;
  onCreate: (fields: PuzzleCreateFields) => Promise<{ id: number }>;
  onCreated: (id: number) => void;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [titleLipi, setTitleLipi] = useState(true);
  const [descriptionLipi, setDescriptionLipi] = useState(false);
  const [overrideRedirectSlug, setOverrideRedirectSlug] = useState(false);
  const [overrideForSlug, setOverrideForSlug] = useState('');
  const titleTyping = useMemo(() => createTypingContext('Devanagari'), []);
  const descriptionTyping = useMemo(() => createTypingContext('Devanagari'), []);

  const {
    status: slugStatus,
    normalizedSlug,
    redirectConflict
  } = useDebouncedSlugCheck(slug, {
    enabled: open,
    checkSlug,
    isValidSlugFn
  });

  const effectiveOverride = overrideRedirectSlug && overrideForSlug === normalizedSlug;
  const slugReady =
    slugStatus === 'available' || (slugStatus === 'redirect_conflict' && effectiveOverride);
  const canSubmit = title.trim().length > 0 && slugReady && normalizedSlug.length > 0;

  const resetForm = () => {
    setConfirmOpen(false);
    setTitle('');
    setDescription('');
    setSlug('');
    setOverrideRedirectSlug(false);
    setOverrideForSlug('');
    setTitleLipi(true);
    setDescriptionLipi(false);
    onClose?.();
  };

  const submit = async () => {
    setPending(true);
    try {
      const result = await onCreate({
        title: title.trim(),
        slug: normalizedSlug,
        description: description.trim(),
        override_redirect_slug: slugStatus === 'redirect_conflict' && effectiveOverride
      });
      toast.success('Puzzle added');
      setOpen(false);
      resetForm();
      onCreated(result.id);
    } catch {
      toast.error('Failed to add puzzle');
      setConfirmOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant={triggerVariant}
              className={cn('inline-flex items-center gap-2', triggerClassName)}
            >
              <IoMdAdd className="size-5" />
              {triggerLabel}
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="puzzle-add-title">Title</Label>
                {lipi ? (
                  <LipiLekhikaSwitch
                    checked={titleLipi}
                    onCheckedChange={setTitleLipi}
                    label="Lipi Lekhika for title"
                  />
                ) : null}
              </div>
              <Input
                id="puzzle-add-title"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                onBeforeInput={
                  lipi
                    ? (event) =>
                        handleTypingBeforeInputEvent(titleTyping, event, setTitle, titleLipi)
                    : undefined
                }
                onBlur={() => titleTyping.clearContext()}
                onKeyDown={(event) => {
                  if (lipi && isLipiToggleKey(event)) {
                    event.preventDefault();
                    setTitleLipi((prev) => !prev);
                  }
                  clearTypingContextOnKeyDown(event, titleTyping);
                }}
                placeholder="Puzzle title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="puzzle-add-slug">Slug</Label>
              <div className="relative">
                <Input
                  id="puzzle-add-slug"
                  value={slug}
                  className="pr-9"
                  placeholder="my-puzzle-slug"
                  onChange={(event) => setSlug(event.currentTarget.value)}
                />
                <span className="absolute inset-y-0 right-2 flex items-center">
                  <SlugStatusIcon status={slugStatus} />
                </span>
              </div>
              <SlugStatusHint status={slugStatus} normalizedSlug={normalizedSlug} />
              {slugStatus === 'redirect_conflict' && redirectConflict ? (
                <SlugRedirectConflictPrompt
                  conflict={redirectConflict}
                  overrideConfirmed={effectiveOverride}
                  onOverrideChange={(next) => {
                    setOverrideRedirectSlug(next);
                    setOverrideForSlug(next ? normalizedSlug : '');
                  }}
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="puzzle-add-description">Description</Label>
                {lipi ? (
                  <LipiLekhikaSwitch
                    checked={descriptionLipi}
                    onCheckedChange={setDescriptionLipi}
                    label="Lipi Lekhika for description"
                  />
                ) : null}
              </div>
              <Textarea
                id="puzzle-add-description"
                value={description}
                rows={3}
                placeholder="Leave blank to fill later"
                onChange={(event) => setDescription(event.currentTarget.value)}
                onBeforeInput={
                  lipi
                    ? (event) =>
                        handleTypingBeforeInputEvent(
                          descriptionTyping,
                          event,
                          setDescription,
                          descriptionLipi
                        )
                    : undefined
                }
                onBlur={() => descriptionTyping.clearContext()}
                onKeyDown={(event) => {
                  if (lipi && isLipiToggleKey(event)) {
                    event.preventDefault();
                    setDescriptionLipi((prev) => !prev);
                  }
                  clearTypingContextOnKeyDown(event, descriptionTyping);
                }}
              />
            </div>
            {extraFields}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button disabled={!canSubmit || pending} onClick={() => setConfirmOpen(true)}>
              {pending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDescription
                ? confirmDescription({ title: title.trim(), slug: normalizedSlug })
                : `Create puzzle “${title.trim()}” with slug “${normalizedSlug}”?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={() => void submit()}>
              {pending ? 'Creating…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
