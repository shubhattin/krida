'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '~/lib/utils';

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0
});

/** Vertical drag-to-reorder list keyed by item `id`. */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  className,
  onDragStart,
  onDragSettled,
  children
}: {
  items: readonly T[];
  onReorder: (next: T[]) => void;
  className?: string;
  /** Called when a drag begins — e.g. to collapse tall rows while reordering. */
  onDragStart?: () => void;
  /** Called once the drag ends or is cancelled. */
  onDragSettled?: () => void;
  children: (item: T, index: number) => ReactNode;
}) {
  // dnd-kit generates its a11y IDs from a module-level counter, which diverges
  // between SSR and hydration — a stable id keeps server and client in sync.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const onDragEnd = (event: DragEndEvent) => {
    onDragSettled?.();
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove([...items], from, to));
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      // Rows may change height mid-drag (collapse on drag start), so keep re-measuring.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragSettled}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>{items.map((item, index) => children(item, index))}</div>
      </SortableContext>
    </DndContext>
  );
}

export type SortableHandleProps = {
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
};

/** One sortable row. Render the drag handle with `<DragHandle {...handle} />`. */
export function SortableRow({
  id,
  className,
  children
}: {
  id: string;
  className?: string;
  children: (handle: SortableHandleProps, dragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative'
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, isDragging && 'shadow-xl ring-2 ring-primary/30')}
    >
      {children({ attributes, listeners }, isDragging)}
    </div>
  );
}

export function DragHandle({
  attributes,
  listeners,
  className,
  label = 'Drag to reorder'
}: SortableHandleProps & { className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing',
        className
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
