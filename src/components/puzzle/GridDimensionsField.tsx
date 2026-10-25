'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';

export type GridDimensionLimits = { min: number; max: number };

function sideItems({ min, max }: GridDimensionLimits) {
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const value = min + i;
    return { value, label: String(value) };
  });
}

function SideSelect({
  value,
  onChange,
  limits,
  label
}: {
  value: number;
  onChange: (value: number) => void;
  limits: GridDimensionLimits;
  label: string;
}) {
  const items = sideItems(limits);
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <SelectTrigger className="w-20" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Rows × columns picker limited to the game's allowed grid sizes. */
export function GridDimensionsSelect({
  value,
  onChange,
  limits
}: {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  limits: GridDimensionLimits;
}) {
  return (
    <div className="flex items-center gap-2">
      <SideSelect
        value={value[0]}
        onChange={(rows) => onChange([rows, value[1]])}
        limits={limits}
        label="Rows"
      />
      <span className="text-muted-foreground">×</span>
      <SideSelect
        value={value[1]}
        onChange={(cols) => onChange([value[0], cols])}
        limits={limits}
        label="Columns"
      />
    </div>
  );
}

/**
 * Read-only grid size with an Edit dialog. Applying a new size is destructive: the caller
 * resets the grid in `onApply`.
 */
export function GridDimensionsField({
  dimensions,
  limits,
  onApply
}: {
  dimensions: [number, number];
  limits: GridDimensionLimits;
  onApply: (next: [number, number]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(dimensions);
  const unchanged = draft[0] === dimensions[0] && draft[1] === dimensions[1];

  return (
    <>
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-semibold">Grid dimensions</Label>
          <Input
            value={`${dimensions[0]} × ${dimensions[1]}`}
            disabled
            className="w-36 bg-muted/50"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setDraft(dimensions);
            setOpen(true);
          }}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change grid dimensions</DialogTitle>
            <DialogDescription>
              Changing size clears the grid. You will need to re-enter letters and placements.
            </DialogDescription>
          </DialogHeader>
          <GridDimensionsSelect value={draft} onChange={setDraft} limits={limits} />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Warning: the current grid will be cleared.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={unchanged}
              onClick={() => {
                onApply(draft);
                setOpen(false);
              }}
            >
              Apply & clear grid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
