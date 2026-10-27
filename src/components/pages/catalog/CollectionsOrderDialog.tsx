'use client';

import { useId, useState } from 'react';
import { Image } from '@unpic/react';
import { useRouter } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  GripVerticalIcon,
  ListPlusIcon,
  MinusCircleIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';

export type OrderableCollection = {
  id: number;
  title: string;
  slug: string;
  order_index: number | null;
  created_at: string | Date;
  item_count: number;
  image: { s3_key: string } | null;
};

/** Sortable id of the bar separating ordered (above) from unordered (below) rows. */
const DIVIDER = 'divider';
const rowKey = (row: { id: number }) => `c:${row.id}`;

/** Unordered collections keep the public fallback: newest first. */
const byNewest = (a: OrderableCollection, b: OrderableCollection) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id;

function initialSplit(collections: OrderableCollection[]) {
  const ordered = collections
    .filter((row) => row.order_index !== null)
    .toSorted((a, b) => a.order_index! - b.order_index! || a.id - b.id);
  const unordered = collections.filter((row) => row.order_index === null).toSorted(byNewest);
  return { ordered, unordered };
}

/**
 * Public order of listed collections. Ordered rows sit above the divider and can be dragged;
 * dropping a row below it (or using the minus button) makes it unordered again.
 */
export function CollectionsOrderDialog({
  open,
  onOpenChange,
  collections
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Listed collections only. */
  collections: OrderableCollection[];
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Frozen at open (the dialog remounts per session): a background refetch must not shift
  // the baseline, which doubles as the `expected` order the server checks against.
  const [initial] = useState(() => initialSplit(collections));
  const [ordered, setOrdered] = useState(initial.ordered);
  const [unordered, setUnordered] = useState(initial.unordered);

  const dirty =
    ordered.length !== initial.ordered.length ||
    ordered.some((row, index) => row.id !== initial.ordered[index]?.id);

  // Stable dnd-kit context id: the default comes from a module-level counter
  // that diverges between SSR and hydration (aria-describedby mismatch).
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const save_mut = useMutation(
    trpc.catalog.reorder_collections.mutationOptions({
      onSuccess: async () => {
        toast.success('Collection order saved');
        invalidateCatalogQueries(queryClient, trpc);
        onOpenChange(false);
        await router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || 'Could not save the order');
        // A conflict means the list is stale; refetch so reopening starts from the new order.
        invalidateCatalogQueries(queryClient, trpc);
      }
    })
  );

  const sortableIds = [...ordered.map(rowKey), DIVIDER, ...unordered.map(rowKey)];

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const moved = arrayMove(
      sortableIds,
      sortableIds.indexOf(String(active.id)),
      sortableIds.indexOf(String(over.id))
    );
    const split = moved.indexOf(DIVIDER);
    const all = new Map([...ordered, ...unordered].map((row) => [rowKey(row), row]));
    setOrdered(moved.slice(0, split).map((key) => all.get(key)!));
    setUnordered(
      moved
        .slice(split + 1)
        .map((key) => all.get(key)!)
        .toSorted(byNewest)
    );
  };

  const toTop = (row: OrderableCollection) => {
    setOrdered((current) => [row, ...current.filter((item) => item.id !== row.id)]);
    setUnordered((current) => current.filter((item) => item.id !== row.id));
  };
  const toBottom = (row: OrderableCollection) => {
    setOrdered((current) => [...current.filter((item) => item.id !== row.id), row]);
    setUnordered((current) => current.filter((item) => item.id !== row.id));
  };
  const unorder = (row: OrderableCollection) => {
    setOrdered((current) => current.filter((item) => item.id !== row.id));
    setUnordered((current) => [...current, row].toSorted(byNewest));
  };
  const orderAll = () => {
    setOrdered((current) => [...current, ...unordered]);
    setUnordered([]);
  };
  const reset = () => {
    setOrdered(initial.ordered);
    setUnordered(initial.unordered);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!save_mut.isPending) onOpenChange(next);
      }}
    >
      {/* Fill the viewport height; only the list scrolls, header and footer stay put. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reorder collections</DialogTitle>
          <DialogDescription>
            Public order of listed collections. Drag rows or use the buttons; unordered ones show
            after the ordered ones, newest first.
          </DialogDescription>
        </DialogHeader>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No listed collections to order.</p>
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
                {ordered.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">
                    Nothing ordered yet — drag a collection above the divider or use the buttons.
                  </p>
                ) : null}
                {ordered.map((row, index) => (
                  <OrderRow key={rowKey(row)} row={row} position={index + 1}>
                    <RowButton
                      label={`Move ${row.title} to top`}
                      disabled={index === 0}
                      onClick={() => toTop(row)}
                    >
                      <ArrowUpToLineIcon />
                    </RowButton>
                    <RowButton
                      label={`Move ${row.title} to bottom`}
                      disabled={index === ordered.length - 1}
                      onClick={() => toBottom(row)}
                    >
                      <ArrowDownToLineIcon />
                    </RowButton>
                    <RowButton label={`Make ${row.title} unordered`} onClick={() => unorder(row)}>
                      <MinusCircleIcon />
                    </RowButton>
                  </OrderRow>
                ))}
                <Divider count={unordered.length} onOrderAll={orderAll} />
                {unordered.map((row) => (
                  <OrderRow key={rowKey(row)} row={row} position={null}>
                    <RowButton label={`Move ${row.title} to top`} onClick={() => toTop(row)}>
                      <ArrowUpToLineIcon />
                    </RowButton>
                    <RowButton
                      label={`Add ${row.title} at the end of the order`}
                      onClick={() => toBottom(row)}
                    >
                      <ArrowDownToLineIcon />
                    </RowButton>
                  </OrderRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={!dirty || save_mut.isPending}
            onClick={reset}
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={!dirty || save_mut.isPending}
            onClick={() =>
              save_mut.mutate({
                ids: ordered.map((row) => row.id),
                expected: initial.ordered.map((row) => row.id)
              })
            }
          >
            {save_mut.isPending ? 'Saving…' : 'Save order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Divider({ count, onOrderAll }: { count: number; onOrderAll: () => void }) {
  // Not draggable itself; rows still move around it to cross between the two groups.
  const { setNodeRef, transform, transition } = useSortable({ id: DIVIDER, disabled: true });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 py-2"
    >
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">Unordered ({count})</span>
      {count > 0 ? (
        <Button type="button" size="xs" variant="ghost" onClick={onOrderAll}>
          <ListPlusIcon />
          Order all
        </Button>
      ) : null}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function OrderRow({
  row,
  position,
  children
}: {
  row: OrderableCollection;
  position: number | null;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowKey(row)
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border/70 bg-card px-2 py-1.5',
        position === null && 'border-dashed bg-muted/30',
        isDragging && 'relative z-10 shadow-md'
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground"
        aria-label={`Drag ${row.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="w-7 shrink-0 text-right text-xs font-semibold text-muted-foreground tabular-nums">
        {position === null ? '—' : `#${position}`}
      </span>
      {row.image ? (
        <Image
          src={getCDNUrl(row.image.s3_key)}
          alt=""
          width={48}
          height={32}
          className="h-8 w-12 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="h-8 w-12 shrink-0 rounded bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {row.item_count} game{row.item_count === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

function RowButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
