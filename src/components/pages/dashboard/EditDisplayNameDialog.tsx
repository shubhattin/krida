'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Spinner } from '~/components/ui/spinner';
import { authClient } from '~/lib/auth-client';

const MAX_NAME_LENGTH = 60;

/** Pencil button + dialog that updates the signed-in user's display name via Better Auth. */
export function EditDisplayNameDialog({ name }: { name: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name ?? '');
  const [saving, setSaving] = useState(false);

  const trimmed = value.trim().replace(/\s+/g, ' ');
  const unchanged = trimmed === (name ?? '').trim();
  const invalid = trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH;

  const save = async () => {
    if (invalid || unchanged || saving) return;
    setSaving(true);
    const { error } = await authClient.updateUser({ name: trimmed });
    setSaving(false);
    if (error) {
      toast.error(error.message ?? 'Could not update your name');
      return;
    }
    toast.success('Display name updated');
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Re-seed from the current name each time the dialog opens.
        if (next) setValue(name ?? '');
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit display name"
            title="Edit display name"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit display name</DialogTitle>
            <DialogDescription>
              This is the name shown on your profile and dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="name"
              autoFocus
              aria-invalid={trimmed.length === 0 || undefined}
            />
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {trimmed.length}/{MAX_NAME_LENGTH}
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={invalid || unchanged || saving}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
