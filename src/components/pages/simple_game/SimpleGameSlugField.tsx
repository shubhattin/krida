'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PencilIcon } from 'lucide-react';
import { toast } from 'sonner';
import { client, useTRPC } from '~/api/client';
import { SlugRedirectConflictPrompt } from '~/components/pages/padavali/SlugRedirectConflictPrompt';
import { SlugStatusHint, SlugStatusIcon } from '~/components/puzzle/SlugStatus';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useDebouncedSlugCheck } from '~/hooks/useDebouncedSlugCheck';
import type { SimpleGameKind } from '~/util/games/kinds';
import { isValidSimpleGameSlug } from '~/util/puzzle/slug';

export function SimpleGameSlugField({
  kind,
  puzzleId,
  slug,
  onSlugUpdated
}: {
  kind: SimpleGameKind;
  puzzleId: number;
  slug: string;
  onSlugUpdated: (slug: string) => void;
}) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(slug);
  const [overrideRedirectSlug, setOverrideRedirectSlug] = useState(false);
  const [overrideForSlug, setOverrideForSlug] = useState('');

  const { status, normalizedSlug, redirectConflict } = useDebouncedSlugCheck(draft, {
    enabled: open,
    excludePuzzleId: puzzleId,
    checkSlug: (params) => client[kind].check_slug_availability.query(params),
    isValidSlugFn: isValidSimpleGameSlug
  });

  const effectiveOverride = overrideRedirectSlug && overrideForSlug === normalizedSlug;
  const slugReady =
    normalizedSlug === slug ||
    status === 'available' ||
    (status === 'redirect_conflict' && effectiveOverride);

  const update_mut = useMutation(
    trpc[kind].update_puzzle_slug.mutationOptions({
      onSuccess: (result) => {
        toast.success('Slug updated');
        onSlugUpdated(result.slug);
        setOpen(false);
      },
      onError: () => toast.error('Could not update slug')
    })
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">{slug}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(slug);
            setOpen(true);
          }}
        >
          <PencilIcon className="size-3.5" />
          Edit slug
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change slug</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`${kind}-edit-slug`}>Slug</Label>
            <div className="relative">
              <Input
                id={`${kind}-edit-slug`}
                value={draft}
                className="pr-9"
                onChange={(event) => setDraft(event.currentTarget.value)}
              />
                <span className="absolute inset-y-0 right-2 flex items-center">
                  <SlugStatusIcon status={status} />
                </span>
              </div>
              <SlugStatusHint status={status} normalizedSlug={normalizedSlug} />
              <p className="text-xs text-muted-foreground">The previous slug stays as a redirect.</p>
            {status === 'redirect_conflict' && redirectConflict ? (
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
          <DialogFooter>
            <Button
              disabled={!slugReady || update_mut.isPending || normalizedSlug === slug}
              onClick={() =>
                update_mut.mutate({
                  puzzle_id: puzzleId,
                  current_slug: slug,
                  new_slug: normalizedSlug,
                  override_redirect_slug: status === 'redirect_conflict' && effectiveOverride
                })
              }
            >
              Save slug
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
