'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { IoMdAdd } from 'react-icons/io';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { toast } from 'sonner';
import { client, useTRPC } from '~/api/client';
import { LanguageIcon } from '~/components/icons';
import { SlugRedirectConflictPrompt } from '~/components/pages/padavali/SlugRedirectConflictPrompt';
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
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { useDebouncedSlugCheck } from '~/hooks/useDebouncedSlugCheck';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { SIMPLE_GAME_META, simpleGameEditHref, type SimpleGameKind } from '~/util/games/kinds';
import { isValidSimpleGameSlug } from '~/util/puzzle/slug';

export function SimpleGameAddDialog({ kind }: { kind: SimpleGameKind }) {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const meta = SIMPLE_GAME_META[kind];
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [lipi, setLipi] = useState(true);
  const [overrideRedirectSlug, setOverrideRedirectSlug] = useState(false);
  const [overrideForSlug, setOverrideForSlug] = useState('');
  const typing = useMemo(() => createTypingContext('Devanagari'), []);

  const { status: slugStatus, normalizedSlug, redirectConflict } = useDebouncedSlugCheck(slug, {
    enabled: open,
    checkSlug: (params) => client[kind].check_slug_availability.query(params),
    isValidSlugFn: isValidSimpleGameSlug
  });

  const effectiveOverride = overrideRedirectSlug && overrideForSlug === normalizedSlug;
  const add_mut = useMutation(
    trpc[kind].add_puzzle.mutationOptions({
      onSuccess(data) {
        toast.success('Puzzle added');
        setOpen(false);
        setConfirmOpen(false);
        resetForm();
        navigate({ href: simpleGameEditHref(kind, data.id) });
      },
      onError() {
        toast.error('Failed to add puzzle');
        setConfirmOpen(false);
      }
    })
  );

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
    setLipi(true);
  };

  const toggleLipi = (event: KeyboardEvent) => {
    if (
      event.altKey &&
      (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault();
      setLipi((prev) => !prev);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (add_mut.isPending) return;
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogTrigger
          render={
            <Button className={cn('inline-flex items-center gap-2', meta.accent.cta)}>
              <IoMdAdd className="size-5" />
              New {meta.name}
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg" onKeyDown={toggleLipi}>
          <DialogHeader>
            <DialogTitle>New {meta.nameDev} puzzle</DialogTitle>
            <DialogDescription>{meta.subtitle}. Title and slug are required.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Label className="inline-flex items-center gap-1.5">
              <Switch checked={lipi} onCheckedChange={setLipi} aria-label="Lipi Lekhika" />
              <Icon src={LanguageIcon} className="size-5" />
            </Label>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`${kind}-title`}>Title</Label>
              <Input
                id={`${kind}-title`}
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                onBeforeInput={(event) =>
                  handleTypingBeforeInputEvent(typing, event, setTitle, lipi)
                }
                onBlur={() => typing.clearContext()}
                onKeyDown={(event) => clearTypingContextOnKeyDown(event, typing)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${kind}-slug`}>Slug</Label>
              <div className="relative">
                <Input
                  id={`${kind}-slug`}
                  value={slug}
                  className="pr-9"
                  onChange={(event) => setSlug(event.currentTarget.value)}
                />
                <span className="absolute inset-y-0 right-2 flex items-center">
                  {slugStatus === 'checking' ? (
                    <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                  ) : null}
                  {slugStatus === 'available' ? (
                    <CheckIcon className="size-4 text-green-600" />
                  ) : null}
                  {slugStatus === 'taken' || slugStatus === 'invalid' ? (
                    <XIcon className="size-4 text-red-600" />
                  ) : null}
                </span>
              </div>
              <p
                className={cn(
                  'text-xs',
                  slugStatus === 'taken' || slugStatus === 'invalid'
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                )}
              >
                {slugStatus === 'invalid'
                  ? 'Only lowercase letters, numbers, underscores, and dashes are allowed.'
                  : null}
                {slugStatus === 'taken'
                  ? 'This slug is already used by another puzzle and cannot be reused.'
                  : null}
                {slugStatus === 'available' ? `Available as "${normalizedSlug}".` : null}
                {slugStatus === 'redirect_conflict'
                  ? `Slug "${normalizedSlug}" conflicts with an existing redirect.`
                  : null}
              </p>
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
            <div className="space-y-1">
              <Label htmlFor={`${kind}-description`}>Description</Label>
              <Textarea
                id={`${kind}-description`}
                value={description}
                rows={3}
                onChange={(event) => setDescription(event.currentTarget.value)}
                onBeforeInput={(event) =>
                  handleTypingBeforeInputEvent(typing, event, setDescription, lipi)
                }
                onBlur={() => typing.clearContext()}
                onKeyDown={(event) => clearTypingContextOnKeyDown(event, typing)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!canSubmit || add_mut.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create this puzzle?</AlertDialogTitle>
            <AlertDialogDescription>
              “{title.trim()}” will open in the editor next.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={add_mut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={add_mut.isPending}
              onClick={() =>
                add_mut.mutate({
                  title: title.trim(),
                  slug: normalizedSlug,
                  description: description.trim(),
                  override_redirect_slug: slugStatus === 'redirect_conflict' && effectiveOverride
                })
              }
            >
              {add_mut.isPending ? 'Creating…' : 'Create'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
