'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { atom, useAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, ChevronLeft, ChevronRight, Info, Pencil, WandSparkles } from 'lucide-react';
import { IoMdAdd, IoMdClose } from 'react-icons/io';
import { MdDeleteOutline, MdDragIndicator } from 'react-icons/md';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { useTRPC } from '~/api/client';
import type { CrossordPuzzle, CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';
import { crossword_update_input_schema } from '~/db/crossword_shared';
import {
  ATTACHMENT_TYPE_NAMES,
  type attachment_schema,
  type image_schema
} from '~/db/db_shared_vals';
import { z } from 'zod';
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
  AlertDialogTitle,
  AlertDialogTrigger
} from '~/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Switch } from '~/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import { analyzeWordPlacements } from '~/util/cross_word/placement';
import {
  generateCrosswordLayouts,
  rankGeneratedLayouts,
  type GeneratedCrosswordLayout,
  type LayoutDensity,
  type LayoutRanking
} from '~/util/cross_word/layout_generator';
import {
  CROSSWORD_MAX_DIM,
  CROSSWORD_MIN_DIM,
  cellHasLetter,
  clampDimension,
  createEmptyGridData,
  formatGridCellRef,
  isBoxCell,
  normalizeAlphaLetter,
  rowIndexToLetter,
  colIndexToNumberLabel
} from '~/util/cross_word/grid';
import { CrosswordSlugField } from '~/components/pages/cross_word/EditCrosswordSlugDialog';
import { PuzzleCardImageSection } from '~/components/pages/puzzle/PuzzleCardImageSection';
import { EditorActionDock } from '~/components/pages/puzzle/EditorActionDock';
import {
  EditorHistoryProvider,
  useEditorHistoryActions,
  useHistoryTextField
} from '~/hooks/useEditorHistory';
import { Badge } from '~/components/ui/badge';
import { Checkbox } from '~/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { isWordAdded } from '~/util/puzzle/word_list';

const BASE_SCRIPT = 'Devanagari';

type EditableWord = {
  id: string;
  word: string;
  word_dev: string;
  description: string;
  location: [number, number];
  direction: CrossWordPuzzleWord['direction'];
  added: boolean;
};

type EditableAttachment = Omit<z.infer<typeof attachment_schema>, 'id'> & {
  id: number | null;
};

const ATTACHMENT_TYPE_ITEMS = [
  { label: 'Select attachment type', value: null },
  ...Object.entries(ATTACHMENT_TYPE_NAMES).map(([key, value]) => ({
    label: value,
    value: key
  }))
];

const title_atom = atom('');
const description_atom = atom('');
const listed_atom = atom(false);
const grid_dimensions_atom = atom<[number, number]>([10, 10]);
const grid_data_atom = atom<CrossordPuzzleGridCell[][]>([]);
const word_list_atom = atom<EditableWord[]>([]);
const attachments_atom = atom<EditableAttachment[]>([]);
const image_id_atom = atom<number | null>(null);
const image_baseline_atom = atom<number | null>(null);
const image_info_atom = atom<{ id: number; s3_key: string; width: number; height: number } | null>(
  null
);

const CROSSWORD_HISTORY_ATOMS = {
  title: title_atom,
  description: description_atom,
  listed: listed_atom,
  grid_dimensions: grid_dimensions_atom,
  grid_data: grid_data_atom,
  word_list: word_list_atom,
  attachments: attachments_atom,
  image_id: image_id_atom,
  image_info: image_info_atom
};

export type ViewEditCrosswordProps = {
  puzzle: CrossordPuzzle & {
    attachments: z.infer<typeof attachment_schema>[];
    image?: z.infer<typeof image_schema> | null;
  };
};

function createEditableWordId() {
  return crypto.randomUUID();
}

function toEditableWords(words: CrossWordPuzzleWord[]): EditableWord[] {
  return words.map((w) => ({
    id: createEditableWordId(),
    word: w.word,
    word_dev: w.word_dev,
    description: w.description,
    location: w.location,
    direction: w.direction,
    added: w.added !== false
  }));
}

function editableWordsComparable(words: EditableWord[]) {
  return words.map(({ word, word_dev, description, location, direction, added }) => ({
    word,
    word_dev,
    description,
    location,
    direction,
    added
  }));
}

function crosswordHistoryComparable(snapshot: {
  title: string;
  description: string;
  listed: boolean;
  grid_dimensions: [number, number];
  grid_data: CrossordPuzzleGridCell[][];
  word_list: EditableWord[];
  attachments: EditableAttachment[];
  image_id: number | null;
  image_info: { id: number; s3_key: string; width: number; height: number } | null;
}) {
  return {
    ...snapshot,
    word_list: editableWordsComparable(snapshot.word_list)
  };
}

export default function ViewEditCrossword({ puzzle: initialPuzzle }: ViewEditCrosswordProps) {
  const [puzzle, setPuzzle] = useState(initialPuzzle);

  useHydrateAtoms([
    [title_atom, puzzle.title],
    [description_atom, puzzle.description],
    [listed_atom, puzzle.listed],
    [grid_dimensions_atom, puzzle.grid_dimensions],
    [grid_data_atom, puzzle.grid_data],
    [word_list_atom, toEditableWords(puzzle.word_list)],
    [attachments_atom, puzzle.attachments],
    [image_id_atom, puzzle.image?.id ?? puzzle.image_id ?? null],
    [image_baseline_atom, puzzle.image?.id ?? puzzle.image_id ?? null],
    [image_info_atom, puzzle.image ?? null]
  ]);

  return (
    <EditorHistoryProvider atoms={CROSSWORD_HISTORY_ATOMS} comparable={crosswordHistoryComparable}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-2 py-4 pb-28 sm:px-4">
        <CrosswordSlugField
          slug={puzzle.slug}
          puzzleId={puzzle.id}
          onSlugUpdated={(slug) => setPuzzle((prev) => ({ ...prev, slug }))}
        />
        <TitleField />
        <DescriptionField />
        <div className="flex flex-wrap items-center gap-6">
          <ListedSwitch />
          <DimensionsField />
        </div>
        <WordListEditor />
        <PlacementAndGrid />
        <AttachmentsEditor />
        <CrosswordPuzzleImageSection puzzleId={puzzle.id} />
        <SaveControls puzzle={puzzle} />
      </div>
    </EditorHistoryProvider>
  );
}

const CrosswordPuzzleImageSection = ({ puzzleId }: { puzzleId: number }) => {
  const [image_id, setImageId] = useAtom(image_id_atom);
  const [, setImageBaseline] = useAtom(image_baseline_atom);
  const [image_info, setImageInfo] = useAtom(image_info_atom);
  const [title] = useAtom(title_atom);
  const [description] = useAtom(description_atom);
  const [wordList] = useAtom(word_list_atom);

  return (
    <PuzzleCardImageSection
      puzzleId={puzzleId}
      game="crossword"
      title={title}
      description={description}
      words={wordList
        .filter((w) => w.added)
        .map((w) => w.word)
        .filter((w) => w.trim().length > 0)}
      imageId={image_id}
      imageInfo={image_info}
      onImageIdChange={setImageId}
      onImageInfoChange={setImageInfo}
      onImageBaselineChange={setImageBaseline}
    />
  );
};

const TitleField = () => {
  const [title, setTitle] = useAtom(title_atom);
  const historyField = useHistoryTextField();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="crossword-title" className="text-lg font-semibold">
        Title
      </Label>
      <Input
        id="crossword-title"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        onFocus={historyField.onFocus}
        onBlur={historyField.onBlur}
        className="max-w-xl text-base"
      />
    </div>
  );
};

const DescriptionField = () => {
  const [description, setDescription] = useAtom(description_atom);
  const historyField = useHistoryTextField();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="crossword-description" className="text-lg font-semibold">
        Description
      </Label>
      <Textarea
        id="crossword-description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        onFocus={historyField.onFocus}
        onBlur={historyField.onBlur}
        rows={3}
        className="max-w-2xl"
        placeholder="Enter a description for the puzzle..."
        required
      />
    </div>
  );
};

const SortableAttachmentItem = ({
  attachment,
  index,
  onUpdate,
  onRemove
}: {
  attachment: EditableAttachment;
  index: number;
  onUpdate: (
    field: keyof EditableAttachment,
    value: EditableAttachment[keyof EditableAttachment]
  ) => void;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `attachment-${index}`
  });
  const historyField = useHistoryTextField();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'space-y-2 rounded-md border p-3',
        isDragging && 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-950'
      )}
    >
      <div className="flex items-center">
        <div className="flex items-center gap-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab touch-none"
            aria-label={`Reorder attachment ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <MdDragIndicator className="size-4 text-gray-500" />
          </Button>
          <span className="flex items-center gap-x-2">
            <Label className="text-sm font-semibold">Order Index</Label>
            <span className="flex h-7 w-16 items-center justify-center rounded-md border bg-gray-50 px-2 text-sm dark:bg-gray-900">
              {attachment.order_index}
            </span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label={`Remove attachment ${index + 1}`}
          onClick={onRemove}
        >
          <IoMdClose className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Label>Type</Label>
          <Select
            items={ATTACHMENT_TYPE_ITEMS}
            value={attachment.type}
            onValueChange={(value) => {
              if (value) {
                // SAFETY: select items are exactly the EditableAttachment type keys
                onUpdate('type', value as EditableAttachment['type']);
              }
            }}
          >
            <SelectTrigger className="w-40" aria-label={`Attachment ${index + 1} type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ATTACHMENT_TYPE_NAMES).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Label>URL</Label>
          <Input
            type="text"
            className="w-64 text-sm"
            value={attachment.url}
            aria-label={`Attachment ${index + 1} URL`}
            onInput={(e) => onUpdate('url', e.currentTarget.value)}
            onFocus={historyField.onFocus}
            onBlur={historyField.onBlur}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label>
          Title <span className="text-xs text-gray-500 dark:text-gray-400">Optional</span>
        </Label>
        <Input
          type="text"
          className="w-full text-sm"
          value={attachment.title ?? ''}
          aria-label={`Attachment ${index + 1} title`}
          onChange={(e) => onUpdate('title', e.currentTarget.value || null)}
          onFocus={historyField.onFocus}
          onBlur={historyField.onBlur}
        />
      </div>
    </div>
  );
};

const AttachmentsEditor = () => {
  const [attachments, setAttachments] = useAtom(attachments_atom);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const addAttachment = () => {
    setAttachments((prev) => [
      ...prev,
      {
        type: 'youtube_embed',
        url: '',
        title: null,
        order_index: prev.length + 1,
        id: null
      }
    ]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((attachment, i) => ({
          ...attachment,
          order_index: i + 1
        }))
    );
  };

  const updateAttachment = (
    index: number,
    field: keyof EditableAttachment,
    value: EditableAttachment[keyof EditableAttachment]
  ) => {
    setAttachments((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setAttachments((items) => {
      const oldIndex = items.findIndex((_, i) => `attachment-${i}` === active.id);
      const newIndex = items.findIndex((_, i) => `attachment-${i}` === over.id);
      return arrayMove(items, oldIndex, newIndex).map((attachment, i) => ({
        ...attachment,
        order_index: i + 1
      }));
    });
  };

  return (
    <Accordion className="w-fit max-w-full">
      <AccordionItem value="attachments">
        <AccordionTrigger className="text-base font-semibold">
          Media Attachments ({attachments.length})
        </AccordionTrigger>
        <AccordionContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={attachments.map((_, i) => `attachment-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {attachments.map((attachment, index) => (
                  <SortableAttachmentItem
                    key={`attachment-${index}`}
                    attachment={attachment}
                    index={index}
                    onUpdate={(field, value) => updateAttachment(index, field, value)}
                    onRemove={() => removeAttachment(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            variant="outline"
            size="sm"
            className={cn(attachments.length > 0 && 'mt-4')}
            onClick={addAttachment}
          >
            <IoMdAdd />
            Add Attachment
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const ListedSwitch = () => {
  const [listed, setListed] = useAtom(listed_atom);
  const [gridData] = useAtom(grid_data_atom);
  const [wordList] = useAtom(word_list_atom);

  const analysis = useMemo(() => analyzeWordPlacements(gridData, wordList), [gridData, wordList]);

  return (
    <div className="flex flex-col gap-1">
      <Label className="inline-flex items-center gap-2 font-medium">
        <Switch
          checked={listed}
          onCheckedChange={(checked) => {
            if (checked && !analysis.canList) {
              toast.error(
                'Cannot list until every word has exactly one valid placement on the grid'
              );
              return;
            }
            setListed(checked);
          }}
        />
        <span className="text-lg font-bold">Listed</span>
      </Label>
      {!analysis.canList && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Fix placement warnings before listing publicly.
        </p>
      )}
    </div>
  );
};

const DimensionsField = () => {
  const [dimensions, setDimensions] = useAtom(grid_dimensions_atom);
  const [, setGridData] = useAtom(grid_data_atom);
  const [, setWordList] = useAtom(word_list_atom);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(dimensions[0]);
  const [cols, setCols] = useState(dimensions[1]);

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
            setRows(dimensions[0]);
            setCols(dimensions[1]);
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
            <span>×</span>
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
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Warning: the current grid will be cleared.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const next: [number, number] = [clampDimension(rows), clampDimension(cols)];
                setDimensions(next);
                setGridData(createEmptyGridData(next));
                // SAFETY: grid reset pins every word to the origin, horizontal
                setWordList((prev) =>
                  prev.map((w) => ({
                    ...w,
                    location: [0, 0] as [number, number],
                    direction: 'horizontal' as const
                  }))
                );
                setOpen(false);
                toast.success(`Grid reset to ${next[0]}×${next[1]}`);
              }}
            >
              Apply & clear grid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

type CrosswordWordRowProps = {
  item: EditableWord;
  originalIndex: number;
  /** Index among currently rendered rows (for ↑↓←→ navigation). */
  listRowIndex: number;
  listRowCount: number;
  showSelection: boolean;
  showRemove: boolean;
  startLabel: string;
  statusTitle: string;
  typingContext: ReturnType<typeof createTypingContext>;
  lipiLekhikaActive: boolean;
  onUpdate: (index: number, patch: Partial<EditableWord>) => void;
  onToggleAdded: (index: number, added: boolean) => void;
  onRemove: (index: number) => void;
};

type WordListField = 'word' | 'dev' | 'clue';
const WORD_LIST_FIELDS: WordListField[] = ['word', 'dev', 'clue'];

function focusWordListInput(
  container: ParentNode,
  row: number,
  field: WordListField
): HTMLInputElement | null {
  const el = container.querySelector<HTMLInputElement>(
    `input[data-wl-row="${row}"][data-wl-field="${field}"]`
  );
  if (!el) return null;
  el.focus();
  const end = el.value.length;
  el.setSelectionRange(end, end);
  return el;
}

function CrosswordWordRow({
  item,
  originalIndex,
  listRowIndex,
  listRowCount,
  showSelection,
  showRemove,
  startLabel,
  statusTitle,
  typingContext,
  lipiLekhikaActive,
  onUpdate,
  onToggleAdded,
  onRemove
}: CrosswordWordRowProps) {
  const wordHistoryField = useHistoryTextField();
  const wordDevHistoryField = useHistoryTextField();
  const clueHistoryField = useHistoryTextField();
  const isAdded = isWordAdded(item);
  const hasLatinWord = item.word.trim().length > 0;
  const missingWordDev = isAdded && hasLatinWord && item.word_dev.trim().length === 0;
  const missingClue = isAdded && hasLatinWord && item.description.trim().length === 0;

  const handleListNavKeyDown = (event: KeyboardEvent<HTMLInputElement>, field: WordListField) => {
    const container = event.currentTarget.closest('[data-word-list]');
    if (!container) return;

    const fieldIndex = WORD_LIST_FIELDS.indexOf(field);
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const atStart = start === 0 && end === 0;
    const atEnd = start === input.value.length && end === input.value.length;

    const moveTo = (row: number, nextField: WordListField) => {
      if (focusWordListInput(container, row, nextField)) {
        event.preventDefault();
      }
    };

    if (event.key === 'ArrowUp' && listRowIndex > 0) {
      moveTo(listRowIndex - 1, field);
      return;
    }
    if (event.key === 'ArrowDown' && listRowIndex < listRowCount - 1) {
      moveTo(listRowIndex + 1, field);
      return;
    }
    if (event.key === 'ArrowLeft' && atStart) {
      if (fieldIndex > 0) moveTo(listRowIndex, WORD_LIST_FIELDS[fieldIndex - 1]!);
      else if (listRowIndex > 0) moveTo(listRowIndex - 1, 'clue');
      return;
    }
    if (event.key === 'ArrowRight' && atEnd) {
      if (fieldIndex < WORD_LIST_FIELDS.length - 1) {
        moveTo(listRowIndex, WORD_LIST_FIELDS[fieldIndex + 1]!);
      } else if (listRowIndex < listRowCount - 1) {
        moveTo(listRowIndex + 1, 'word');
      }
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border/50 bg-muted/10 p-2.5 sm:flex-row sm:flex-nowrap sm:items-start sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0',
        !isAdded && 'opacity-90'
      )}
    >
      <div className="flex min-w-0 items-start gap-2 sm:contents">
        {showSelection ? (
          <Checkbox
            checked={isAdded}
            onCheckedChange={(checked) => onToggleAdded(originalIndex, checked === true)}
            aria-label={isAdded ? 'Exclude word from puzzle' : 'Include word in puzzle'}
            className="mt-2.5 shrink-0"
          />
        ) : null}
        <Input
          value={item.word}
          data-wl-row={listRowIndex}
          data-wl-field="word"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="characters"
          autoComplete="off"
          onChange={(e) =>
            onUpdate(originalIndex, {
              word: e.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, '')
            })
          }
          onFocus={wordHistoryField.onFocus}
          onBlur={wordHistoryField.onBlur}
          onKeyDown={(event) => handleListNavKeyDown(event, 'word')}
          placeholder="WORD"
          aria-label={`English word ${originalIndex + 1}`}
          className={cn(
            'min-w-0 flex-1 font-mono uppercase sm:w-44 sm:flex-none',
            !isAdded && 'opacity-60'
          )}
        />
        <Input
          value={item.word_dev}
          data-wl-row={listRowIndex}
          data-wl-field="dev"
          onChange={(e) => onUpdate(originalIndex, { word_dev: e.currentTarget.value })}
          onBeforeInput={(event) =>
            handleTypingBeforeInputEvent(
              typingContext,
              event,
              (newValue) => onUpdate(originalIndex, { word_dev: newValue }),
              lipiLekhikaActive
            )
          }
          onFocus={wordDevHistoryField.onFocus}
          onBlur={() => {
            typingContext.clearContext();
            wordDevHistoryField.onBlur();
          }}
          onKeyDown={(event) => {
            clearTypingContextOnKeyDown(event, typingContext);
            handleListNavKeyDown(event, 'dev');
          }}
          placeholder="देवनागरी"
          required={isAdded && hasLatinWord}
          aria-invalid={missingWordDev || undefined}
          aria-label={`Devanagari word ${originalIndex + 1}`}
          title={missingWordDev ? 'Devanagari word is required' : undefined}
          className={cn(
            'min-w-0 flex-1 text-base sm:w-32 sm:flex-none',
            !isAdded && 'opacity-60',
            missingWordDev &&
              'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
          )}
        />
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:contents">
        <Input
          value={item.description}
          data-wl-row={listRowIndex}
          data-wl-field="clue"
          onChange={(e) => onUpdate(originalIndex, { description: e.currentTarget.value })}
          onFocus={clueHistoryField.onFocus}
          onBlur={clueHistoryField.onBlur}
          onKeyDown={(event) => handleListNavKeyDown(event, 'clue')}
          placeholder="Clue / description"
          required={isAdded && hasLatinWord}
          aria-invalid={missingClue || undefined}
          aria-label={`Clue ${originalIndex + 1}`}
          className={cn(
            'min-w-0 flex-1',
            !isAdded && 'opacity-60',
            missingClue &&
              'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
          )}
        />
        <span
          className="inline-flex h-9 min-w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 px-2 font-mono text-xs text-muted-foreground"
          title={statusTitle}
        >
          {startLabel}
        </span>
        {showRemove ? (
          <Button
            variant="ghost"
            className="shrink-0 p-0 text-red-500 has-[>svg]:p-0 dark:text-red-400"
            onClick={() => onRemove(originalIndex)}
            aria-label={`Remove word ${originalIndex + 1}`}
          >
            <IoMdClose className="inline-block" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const LAYOUT_RANKING_ITEMS = [
  { value: 'intersections', label: 'Most crossings' },
  { value: 'words', label: 'Most words' },
  { value: 'letters', label: 'Most letters' }
];

const LAYOUT_DENSITY_ITEMS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'center', label: 'Center' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' }
] as const;

const LAYOUT_DENSITIES = ['balanced', 'center', 'left', 'right', 'top', 'bottom'] as const;

function parseLayoutDensity(value: string | null | undefined): LayoutDensity | null {
  // SAFETY: find() over the literal tuple narrows the query param to a known density
  return LAYOUT_DENSITIES.find((density) => density === value) ?? null;
}

const LAYOUT_CANDIDATE_LIMITS = [4, 8, 12, 16, 24, 32, 40] as const;
type LayoutCandidateLimit = (typeof LAYOUT_CANDIDATE_LIMITS)[number];

const LAYOUT_CANDIDATE_LIMIT_ITEMS = LAYOUT_CANDIDATE_LIMITS.map((limit) => ({
  value: String(limit),
  label: `${limit} layouts`
}));

function parseLayoutCandidateLimit(value: string | null | undefined): LayoutCandidateLimit | null {
  const parsed = Number(value);
  // SAFETY: find() over the literal tuple narrows the parsed number to a known limit
  return LAYOUT_CANDIDATE_LIMITS.find((limit) => limit === parsed) ?? null;
}

function layoutCandidateKey(candidate: GeneratedCrosswordLayout) {
  return candidate.placements
    .map((placement) => `${placement.id}-${placement.location.join(',')}-${placement.direction}`)
    .join('|');
}

const LAYOUT_PREVIEW_FRAME_PX = 256;
const LAYOUT_PREVIEW_GAP_PX = 1;

function GeneratedLayoutPreview({ candidate }: { candidate: GeneratedCrosswordLayout }) {
  const populatedRows = candidate.gridData
    .map((row, index) => (row.some(cellHasLetter) ? index : -1))
    .filter((index) => index >= 0);
  const populatedColumns = (candidate.gridData[0] ?? [])
    .map((_, columnIndex) =>
      candidate.gridData.some((row) => cellHasLetter(row[columnIndex]!)) ? columnIndex : -1
    )
    .filter((index) => index >= 0);
  if (populatedRows.length === 0 || populatedColumns.length === 0) return null;

  const firstRow = populatedRows[0]!;
  const lastRow = populatedRows[populatedRows.length - 1]!;
  const firstColumn = populatedColumns[0]!;
  const lastColumn = populatedColumns[populatedColumns.length - 1]!;
  const previewRows = candidate.gridData
    .slice(firstRow, lastRow + 1)
    .map((row) => row.slice(firstColumn, lastColumn + 1));
  const rowCount = previewRows.length;
  const columnCount = previewRows[0]!.length;
  const majorSpan = Math.max(rowCount, columnCount, 1);
  const cellPx = Math.max(
    1,
    Math.floor((LAYOUT_PREVIEW_FRAME_PX - (majorSpan - 1) * LAYOUT_PREVIEW_GAP_PX) / majorSpan)
  );
  const gridWidth = cellPx * columnCount + LAYOUT_PREVIEW_GAP_PX * Math.max(0, columnCount - 1);
  const gridHeight = cellPx * rowCount + LAYOUT_PREVIEW_GAP_PX * Math.max(0, rowCount - 1);
  const fontSizePx = Math.max(8, Math.min(12, cellPx - 4));
  const rangeLabel = `${formatGridCellRef(firstRow, firstColumn)}–${formatGridCellRef(lastRow, lastColumn)}`;

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/20 p-1"
      style={{ width: LAYOUT_PREVIEW_FRAME_PX + 10, height: LAYOUT_PREVIEW_FRAME_PX + 10 }}
    >
      <div
        aria-label={`Letter-cell preview from ${rangeLabel}`}
        className="grid bg-border/60"
        style={{
          width: gridWidth,
          height: gridHeight,
          gap: LAYOUT_PREVIEW_GAP_PX,
          gridTemplateColumns: `repeat(${columnCount}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${rowCount}, ${cellPx}px)`
        }}
      >
        {previewRows.flatMap((row, rowIndex) =>
          row.map((cell, columnIndex) => (
            <span
              key={`${rowIndex}-${columnIndex}`}
              className={cn(
                'flex items-center justify-center overflow-hidden font-mono leading-none font-semibold',
                cellHasLetter(cell)
                  ? 'bg-blue-50 text-foreground dark:bg-blue-950/50'
                  : 'bg-popover text-transparent'
              )}
              style={{
                width: cellPx,
                height: cellPx,
                fontSize: fontSizePx,
                lineHeight: 1
              }}
            >
              {cell.text}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function WordChipList({
  ids,
  wordNames,
  emptyLabel,
  tone = 'default'
}: {
  ids: readonly string[];
  wordNames: ReadonlyMap<string, string>;
  emptyLabel: string;
  tone?: 'default' | 'warning';
}) {
  if (ids.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <Badge
          key={id}
          variant="outline"
          className={cn(
            'max-w-full font-mono normal-case',
            tone === 'warning' &&
              'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
          )}
        >
          <span className="truncate">
            {wordNames.get(id)?.trim().toUpperCase() || 'Untitled word'}
          </span>
        </Badge>
      ))}
    </div>
  );
}

function LayoutCandidateDetail({
  candidate,
  wordNames
}: {
  candidate: GeneratedCrosswordLayout;
  wordNames: ReadonlyMap<string, string>;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <GeneratedLayoutPreview candidate={candidate} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Placed</h4>
            <Badge variant="secondary" className="tabular-nums">
              {candidate.placedIds.length}
            </Badge>
          </div>
          <WordChipList
            ids={candidate.placedIds}
            wordNames={wordNames}
            emptyLabel="No words placed in this layout."
          />
        </div>
        {candidate.omittedIds.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300">Excluded</h4>
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-700 tabular-nums dark:text-amber-300"
              >
                {candidate.omittedIds.length}
              </Badge>
            </div>
            <WordChipList
              ids={candidate.omittedIds}
              wordNames={wordNames}
              emptyLabel="No excluded words."
              tone="warning"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LayoutTabsCarousel({
  candidates,
  activeKey,
  onSelect
}: {
  candidates: GeneratedCrosswordLayout[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
    skipSnaps: true,
    // Tabs are buttons; Embla skips drag on interactive targets unless we opt in.
    watchDrag: () => true
  });
  const activeIndex = candidates.findIndex(
    (candidate) => layoutCandidateKey(candidate) === activeKey
  );
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < candidates.length - 1;

  useEffect(() => {
    emblaApi?.reInit();
  }, [candidates, emblaApi]);

  useEffect(() => {
    if (!emblaApi || activeIndex < 0) return;
    emblaApi.scrollTo(activeIndex);
  }, [activeKey, activeIndex, emblaApi]);

  const goToIndex = (index: number) => {
    const next = candidates[index];
    if (!next) return;
    onSelect(layoutCandidateKey(next));
    emblaApi?.scrollTo(index);
  };

  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-b border-border bg-popover px-3 py-2 sm:px-4">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          disabled={!canGoPrev}
          aria-label="Previous layout"
          onClick={() => goToIndex(activeIndex - 1)}
        >
          <ChevronLeft />
        </Button>

        <div
          ref={emblaRef}
          className="min-w-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        >
          <TabsList
            variant="line"
            className="flex! h-auto w-max max-w-none touch-pan-y justify-start gap-1 select-none"
          >
            {candidates.map((candidate, index) => {
              const key = layoutCandidateKey(candidate);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex-none shrink-0 grow-0 basis-auto px-3 select-none"
                >
                  Layout {index + 1}
                  <Badge variant="secondary" className="tabular-nums">
                    {candidate.score.intersectionCount}×
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          disabled={!canGoNext}
          aria-label="Next layout"
          onClick={() => goToIndex(activeIndex + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <p className="px-0.5 text-[11px] text-muted-foreground/70 select-none">
        N× = crossings · drag tabs to browse
      </p>
    </div>
  );
}

function CrosswordLayoutGenerator() {
  const [wordList, setWordList] = useAtom(word_list_atom);
  const [dimensions] = useAtom(grid_dimensions_atom);
  const [, setGridData] = useAtom(grid_data_atom);
  const { commit } = useEditorHistoryActions();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ranking, setRanking] = useState<LayoutRanking>('intersections');
  const [density, setDensity] = useState<LayoutDensity>('balanced');
  const [maxCandidates, setMaxCandidates] = useState<LayoutCandidateLimit>(16);
  const [generationSeed, setGenerationSeed] = useState(1);
  const [candidates, setCandidates] = useState<GeneratedCrosswordLayout[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [candidateToApply, setCandidateToApply] = useState<GeneratedCrosswordLayout | null>(null);

  const wordNames = useMemo(
    () => new Map(wordList.map((word) => [word.id, word.word])),
    [wordList]
  );
  const rankedCandidates = useMemo(
    () => rankGeneratedLayouts(candidates, ranking),
    [candidates, ranking]
  );
  const rankedKeys = useMemo(() => rankedCandidates.map(layoutCandidateKey), [rankedCandidates]);
  const activeKey = rankedKeys.includes(selectedKey) ? selectedKey : (rankedKeys[0] ?? '');
  const activeCandidate =
    rankedCandidates.find((candidate) => layoutCandidateKey(candidate) === activeKey) ?? null;

  const runGeneration = ({
    limit = maxCandidates,
    rankingOverride = ranking,
    densityOverride = density
  }: {
    limit?: LayoutCandidateLimit;
    rankingOverride?: LayoutRanking;
    densityOverride?: LayoutDensity;
  } = {}) => {
    const usableWords = wordList.filter((word) => word.added && word.word.trim().length >= 2);
    if (usableWords.length === 0) {
      toast.error('Add at least one word with two or more letters before generating a layout');
      return false;
    }
    const nextSeed = generationSeed + 1;
    const nextCandidates = generateCrosswordLayouts({
      words: wordList
        .filter((word) => word.added)
        .map(({ id, word, description }) => ({ id, word, description })),
      dimensions,
      maxCandidates: limit,
      // More layout slots need more randomized search attempts.
      attempts: Math.max(48, limit * 6),
      density: densityOverride,
      seed: nextSeed
    });
    if (nextCandidates.length === 0) {
      toast.error('No valid layouts could be generated for these words and dimensions');
      return false;
    }
    const ranked = rankGeneratedLayouts(nextCandidates, rankingOverride);
    setCandidates(nextCandidates);
    setMaxCandidates(limit);
    setDensity(densityOverride);
    setGenerationSeed(nextSeed);
    setSelectedKey(ranked[0] ? layoutCandidateKey(ranked[0]) : '');
    setCandidateToApply(null);
    return true;
  };

  const openGenerator = () => {
    if (!runGeneration({ rankingOverride: 'intersections' })) return;
    setRanking('intersections');
    setOpen(true);
  };

  const applyCandidate = () => {
    if (!candidateToApply) return;
    const placementById = new Map(
      candidateToApply.placements.map((placement) => [placement.id, placement])
    );
    const omittedIdSet = new Set(candidateToApply.omittedIds);
    setGridData(candidateToApply.gridData);
    setWordList((previous) =>
      previous.map((word) => {
        const placement = placementById.get(word.id);
        if (!placement) {
          if (!omittedIdSet.has(word.id)) return word;
          return {
            ...word,
            added: false
          };
        }
        return {
          ...word,
          added: true,
          location: placement.location,
          direction: placement.direction
        };
      })
    );
    commit();
    setConfirmOpen(false);
    setOpen(false);
    toast.success('Generated layout applied');
  };

  return (
    <>
      <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={openGenerator}>
        <WandSparkles className="size-3.5" />
        Generate layouts
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setCandidateToApply(null);
            setSelectedKey('');
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 gap-1.5 px-4 pt-4 pr-12 pb-3">
            <DialogTitle>Generate crossword layouts</DialogTitle>
            <DialogDescription>
              Browse candidates for the current grid size. Choosing one replaces the grid; words
              that do not fit stay in your list with their clues.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 border-b border-border bg-muted/20 px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Label
                  htmlFor="layout-density"
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  Word density
                </Label>
                <Select
                  items={[...LAYOUT_DENSITY_ITEMS]}
                  value={density}
                  onValueChange={(value) => {
                    const nextDensity = parseLayoutDensity(value);
                    if (!nextDensity || nextDensity === density) return;
                    runGeneration({ densityOverride: nextDensity });
                  }}
                >
                  <SelectTrigger id="layout-density" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_DENSITY_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] leading-snug text-muted-foreground/80">
                  Prefer where words gather on the grid
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label
                  htmlFor="layout-ranking"
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  Rank by
                </Label>
                <Select
                  items={LAYOUT_RANKING_ITEMS}
                  value={ranking}
                  onValueChange={(value) => {
                    if (value === 'intersections' || value === 'words' || value === 'letters') {
                      setRanking(value);
                    }
                  }}
                >
                  <SelectTrigger id="layout-ranking" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_RANKING_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] leading-snug text-muted-foreground/80">
                  Reorders tabs without regenerating
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label
                  htmlFor="layout-candidate-limit"
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  Candidates
                </Label>
                <Select
                  items={[...LAYOUT_CANDIDATE_LIMIT_ITEMS]}
                  value={String(maxCandidates)}
                  onValueChange={(value) => {
                    const nextLimit = parseLayoutCandidateLimit(value);
                    if (!nextLimit || nextLimit === maxCandidates) return;
                    runGeneration({ limit: nextLimit });
                  }}
                >
                  <SelectTrigger id="layout-candidate-limit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_CANDIDATE_LIMIT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] leading-snug text-muted-foreground/80">
                  Max distinct layouts to keep
                </p>
              </div>
            </div>
          </div>

          {rankedCandidates.length > 0 && activeKey ? (
            <Tabs
              value={activeKey}
              onValueChange={setSelectedKey}
              className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
            >
              <LayoutTabsCarousel
                candidates={rankedCandidates}
                activeKey={activeKey}
                onSelect={setSelectedKey}
              />

              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-4 pb-6">
                {rankedCandidates.map((candidate) => {
                  const key = layoutCandidateKey(candidate);
                  return (
                    <TabsContent key={key} value={key} className="mt-0 outline-none">
                      <LayoutCandidateDetail candidate={candidate} wordNames={wordNames} />
                    </TabsContent>
                  );
                })}
              </div>
            </Tabs>
          ) : null}

          <DialogFooter className="shrink-0 border-t border-border px-4 py-3">
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  runGeneration();
                }}
              >
                Generate again
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!activeCandidate}
                  onClick={() => {
                    if (!activeCandidate) return;
                    setCandidateToApply(activeCandidate);
                    setConfirmOpen(true);
                  }}
                >
                  Use this layout
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the current grid?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current grid and updates each placed word&apos;s start and
              direction. Omitted words will be excluded, while their clues remain in the editor. You
              can undo this as one change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current grid</AlertDialogCancel>
            <AlertDialogAction onClick={applyCandidate}>Use generated layout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const WordListEditor = () => {
  const [wordList, setWordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);
  const { commit } = useEditorHistoryActions();
  const [lipiLekhikaActive, setLipiLekhikaActive] = useState(true);
  const typingContext = useMemo(() => createTypingContext(BASE_SCRIPT), []);

  useEffect(() => {
    void typingContext.ready;
  }, [typingContext]);

  const analysis = useMemo(() => analyzeWordPlacements(gridData, wordList), [gridData, wordList]);

  const indexedWords = useMemo(
    () => wordList.map((item, originalIndex) => ({ item, originalIndex })),
    [wordList]
  );
  const addedWords = useMemo(
    () => indexedWords.filter(({ item }) => isWordAdded(item)),
    [indexedWords]
  );

  const addWord = () => {
    setWordList((prev) => [
      ...prev,
      {
        id: createEditableWordId(),
        word: '',
        word_dev: '',
        description: '',
        location: [0, 0],
        direction: 'horizontal',
        added: true
      }
    ]);
    commit();
  };

  const removeWord = (index: number) => {
    setWordList((prev) => prev.filter((_, i) => i !== index));
    commit();
  };

  const updateWord = (index: number, patch: Partial<EditableWord>) => {
    setWordList((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  const toggleAdded = (index: number, added: boolean) => {
    setWordList((prev) => prev.map((w, i) => (i === index ? { ...w, added } : w)));
    commit();
  };

  const renderWordRows = (
    rows: readonly { item: EditableWord; originalIndex: number }[],
    { showSelection, showRemove }: { showSelection: boolean; showRemove: boolean }
  ) => (
    <div className="max-h-80 overflow-y-auto overscroll-contain pr-1" data-word-list>
      <p className="mb-2 hidden text-xs text-muted-foreground/80 sm:block">
        Navigate fields with the arrow keys (↑ ↓ ← →)
      </p>
      <div className="flex flex-col gap-3 sm:gap-2">
        {rows.map(({ item, originalIndex }, listRowIndex) => {
          const status = analysis.statuses[originalIndex];
          const startLabel =
            status?.status === 'ok'
              ? `${formatGridCellRef(status.placement.location[0], status.placement.location[1])} ${
                  status.placement.direction === 'horizontal' ? '→' : '↓'
                }`
              : '—';
          const statusTitle =
            status?.status === 'ok'
              ? `Starts at ${formatGridCellRef(status.placement.location[0], status.placement.location[1])} (${status.placement.direction})`
              : 'Start cell resolved when the word has a unique placement';

          return (
            <CrosswordWordRow
              key={item.id}
              item={item}
              originalIndex={originalIndex}
              listRowIndex={listRowIndex}
              listRowCount={rows.length}
              showSelection={showSelection}
              showRemove={showRemove}
              startLabel={startLabel}
              statusTitle={statusTitle}
              typingContext={typingContext}
              lipiLekhikaActive={lipiLekhikaActive}
              onUpdate={updateWord}
              onToggleAdded={toggleAdded}
              onRemove={removeWord}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="text-lg font-semibold">Words & clues</Label>
        <Label className="inline-flex items-center gap-2 text-sm font-medium">
          <Switch
            checked={lipiLekhikaActive}
            onCheckedChange={setLipiLekhikaActive}
            aria-label="Lipi Lekhika typing for Devanagari words"
          />
          Lipi Lekhika
        </Label>
      </div>
      <Tabs defaultValue="added" className="gap-3">
        <TabsList className="w-full">
          <TabsTrigger value="added" className="flex-1">
            Added Words
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex-1">
            Edit List
          </TabsTrigger>
        </TabsList>
        <TabsContent value="added">
          <div className="flex flex-col gap-3">
            {renderWordRows(addedWords, { showSelection: false, showRemove: false })}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="w-fit gap-1" onClick={addWord}>
                <IoMdAdd className="text-lg" /> Add Word
              </Button>
              <CrosswordLayoutGenerator />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="edit">
          <div className="flex flex-col gap-3">
            {renderWordRows(indexedWords, { showSelection: true, showRemove: true })}
            <Button variant="outline" size="sm" className="w-fit gap-1" onClick={addWord}>
              <IoMdAdd className="text-lg" /> Add Word
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const PlacementAndGrid = () => {
  const [gridData] = useAtom(grid_data_atom);
  const [wordList] = useAtom(word_list_atom);
  const [dimensions] = useAtom(grid_dimensions_atom);

  const analysis = useMemo(() => analyzeWordPlacements(gridData, wordList), [gridData, wordList]);

  return (
    <>
      <PlacementAnalysisPanel analysis={analysis} />
      <GridEditor occupiedCells={analysis.occupiedCells} dimensions={dimensions} />
    </>
  );
};

const PlacementAnalysisPanel = ({
  analysis
}: {
  analysis: ReturnType<typeof analyzeWordPlacements>;
}) => {
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);

  if (gridData.length === 0 || wordList.length === 0) return null;

  const warnings = analysis.statuses
    .map((status, wordIndex) => ({ status, wordIndex }))
    .filter(
      ({ status }) =>
        status.status === 'missing' ||
        status.status === 'ambiguous' ||
        status.status === 'duplicate'
    );

  let uncoveredLetterCount = 0;
  for (let r = 0; r < gridData.length; r++) {
    const row = gridData[r]!;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c]!;
      if (!cellHasLetter(cell)) continue;
      if (!analysis.occupiedCells.has(`${r},${c}`)) uncoveredLetterCount += 1;
    }
  }

  const showSuccess = analysis.hasAllValid && analysis.noVisibleHintWords.length === 0;

  return (
    <AnimatePresence mode="wait">
      {warnings.length > 0 && (
        <motion.div
          key="warnings"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
        >
          <div className="flex flex-col gap-1 text-sm text-amber-700 dark:text-amber-300">
            {warnings.map(({ status, wordIndex }, idx) => (
              <motion.div
                key={`${wordIndex}-${status.status}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                {status.status === 'missing' && (
                  <>
                    &quot;<span className="font-semibold">{status.word}</span>&quot; was not found
                    on the grid.
                  </>
                )}
                {status.status === 'duplicate' && (
                  <>
                    &quot;<span className="font-semibold">{status.word}</span>&quot; appears
                    multiple times in the word list.
                  </>
                )}
                {status.status === 'ambiguous' && (
                  <div className="flex items-center gap-2">
                    <span>
                      &quot;<span className="font-semibold">{status.word}</span>&quot; has multiple
                      paths ({status.placements.length}).
                    </span>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Info className="-mt-0.5 size-4.5 text-amber-600 dark:text-amber-400" />
                        }
                        nativeButton={false}
                      />
                      <PopoverContent className="max-w-xs" align="center">
                        {status.placements.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-1 text-xs">
                            <span className="font-semibold">
                              Path {pIdx + 1} ({p.direction} @{' '}
                              {formatGridCellRef(p.location[0], p.location[1])}):
                            </span>
                            <div className="flex items-center gap-1">
                              {p.cells.map(([r, c], i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span className="font-semibold">{formatGridCellRef(r, c)}</span>
                                  {i < p.cells.length - 1 && <ArrowRight className="size-3" />}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {analysis.noVisibleHintWords.length > 0 && (
        <motion.div
          key="no-visible-hints"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
        >
          <div className="flex flex-col gap-1 text-sm text-amber-700 dark:text-amber-300">
            {analysis.noVisibleHintWords.map(({ word, wordIndex }, idx) => (
              <motion.div
                key={`novis-${wordIndex}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                &quot;<span className="font-semibold">{word}</span>&quot; has no visible (prefilled)
                letter — focus a letter and press Enter or Tab to mark it.
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {uncoveredLetterCount > 0 && (
        <motion.div
          key="uncovered-letters"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
        >
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <span>
              Some cells on the grid have letters that aren&apos;t covered by any word
              {uncoveredLetterCount > 1 ? ` (${uncoveredLetterCount})` : ''}.
            </span>
            <Popover>
              <PopoverTrigger
                render={<Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />}
                nativeButton={false}
              />
              <PopoverContent className="max-w-xs text-xs" align="center">
                This might lead to unstable and unexpected behaviour in the game for players.
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>
      )}

      {showSuccess && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950"
        >
          <div className="flex items-center gap-2">
            <div className="size-2 shrink-0 rounded-full bg-green-500" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              All words are placed correctly!
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const GridEditor = ({
  occupiedCells,
  dimensions
}: {
  occupiedCells: Set<string>;
  dimensions: [number, number];
}) => {
  const [gridData, setGridData] = useAtom(grid_data_atom);
  const gridRef = useRef<HTMLDivElement>(null);
  const [rows, cols] = dimensions;
  const historyField = useHistoryTextField();

  const updateCell = (r: number, c: number, next: CrossordPuzzleGridCell) => {
    setGridData((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[r]![c] = next;
      return copy;
    });
  };

  const setLetter = (r: number, c: number, raw: string) => {
    const cell = gridData[r]?.[c];
    if (!cell) return;
    const letter = normalizeAlphaLetter(raw);
    updateCell(r, c, {
      text: letter,
      // Clearing the letter turns the cell into a blocked box
      is_visible: letter ? cell.is_visible : false
    });
  };

  const toggleVisible = (r: number, c: number) => {
    setGridData((prev) => {
      const cell = prev[r]?.[c];
      if (!cell || !cellHasLetter(cell)) return prev;
      const copy = prev.map((row) => [...row]);
      copy[r]![c] = { ...cell, is_visible: !cell.is_visible };
      return copy;
    });
  };

  const focusCellInput = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-grid-r="${r}"][data-grid-c="${c}"]`
    );
    if (!el) return false;
    el.focus();
    // Single-letter cells — select all so typing replaces immediately
    el.select();
    return true;
  };

  /** Move focus one step in direction if a neighbor cell exists. */
  const moveFocus = (r: number, c: number, dRow: number, dCol: number) => {
    const nextR = r + dRow;
    const nextC = c + dCol;
    if (nextR < 0 || nextC < 0 || nextR >= rows || nextC >= cols) return;
    focusCellInput(nextR, nextC);
  };

  const handleCellKeyDown = (r: number, c: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Enter / Tab toggle prefilled — works with OS soft-keyboard Enter too.
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      toggleVisible(r, c);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveFocus(r, c, 0, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveFocus(r, c, 0, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(r, c, -1, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(r, c, 1, 0);
    }
  };

  const getCellClassName = (r: number, c: number) => {
    const cell = gridData[r]?.[c];
    if (!cell) return '';
    const isBox = isBoxCell(cell);
    const hasLetter = cellHasLetter(cell);
    const isVisible = hasLetter && cell.is_visible;
    const isOccupied = occupiedCells.has(`${r},${c}`);

    return cn(
      // Override default Input border/focus (often bluish) with explicit state rings.
      'h-9 rounded border bg-transparent px-0 text-center font-mono text-sm uppercase shadow-none transition-all duration-200',
      'focus-visible:ring-2 focus-visible:ring-offset-0',
      isBox &&
        'border-transparent bg-muted/50 text-muted-foreground focus-visible:ring-muted-foreground/30',
      // Prefilled hint → green
      isVisible &&
        'border-emerald-500 bg-emerald-50/80 focus-visible:ring-emerald-500/40 dark:border-emerald-400 dark:bg-emerald-950/40',
      // Covered by a word, not prefilled → blue border
      hasLetter &&
        !isVisible &&
        isOccupied &&
        'border-blue-300/80 focus-visible:ring-blue-400/30 dark:border-blue-500/60',
      // Letter not covered by any word → white (orphan)
      hasLetter &&
        !isVisible &&
        !isOccupied &&
        'border-white focus-visible:ring-white/40 dark:border-white/70'
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-lg font-semibold">Grid</Label>
      <p className="text-sm text-foreground/80">
        Press{' '}
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs">
          Enter
        </kbd>{' '}
        or{' '}
        <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-xs">
          Tab
        </kbd>{' '}
        on a letter to mark it as prefilled (soft-keyboard Enter works too).
      </p>
      <p className="hidden text-xs text-muted-foreground/80 sm:block">
        Navigate the grid with the arrow keys (↑ ↓ ← →)
      </p>
      <div
        ref={gridRef}
        className="grid w-full max-w-xl gap-1 sm:max-w-2xl"
        style={{ gridTemplateColumns: `1.25rem repeat(${cols}, minmax(0, 1fr))` }}
      >
        <div aria-hidden className="h-4" />
        {Array.from({ length: cols }, (_, c) => (
          <div
            key={`col-h-${c}`}
            className="flex h-4 items-center justify-center font-mono text-[10px] text-muted-foreground"
          >
            {colIndexToNumberLabel(c)}
          </div>
        ))}

        {gridData.map((row, r) => (
          <div key={`row-${r}`} className="contents">
            <div className="flex items-center justify-center font-mono text-[10px] text-muted-foreground">
              {rowIndexToLetter(r)}
            </div>
            {row.map((cell, c) => {
              const isBox = isBoxCell(cell);
              const cellRef = formatGridCellRef(r, c);

              return (
                <Input
                  key={`${r}-${c}`}
                  type="text"
                  inputMode="text"
                  enterKeyHint="enter"
                  autoComplete="off"
                  data-grid-r={r}
                  data-grid-c={c}
                  value={cell.text}
                  onChange={(e) => setLetter(r, c, e.currentTarget.value)}
                  onKeyDown={(e) => handleCellKeyDown(r, c, e)}
                  onFocus={historyField.onFocus}
                  onBlur={historyField.onBlur}
                  className={getCellClassName(r, c)}
                  maxLength={2}
                  aria-label={
                    isBox
                      ? `Blocked cell ${cellRef} — type a letter to open`
                      : cell.is_visible
                        ? `Cell ${cellRef}, prefilled — press Enter or Tab to unmark`
                        : `Cell ${cellRef} — press Enter or Tab to mark prefilled`
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
        <div className="flex h-3 items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <span className="leading-none">Prefilled</span>
        </div>
        <div className="flex h-3 items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-blue-400 dark:bg-blue-500" aria-hidden />
          <span className="leading-none">In a word</span>
        </div>
        <div className="flex h-3 items-center gap-1.5">
          <div className="size-2 shrink-0 rounded-full bg-white" aria-hidden />
          <span className="leading-none">Not in any word</span>
        </div>
      </div>
    </div>
  );
};

const SaveControls = ({ puzzle }: { puzzle: ViewEditCrosswordProps['puzzle'] }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const [title] = useAtom(title_atom);
  const [description] = useAtom(description_atom);
  const [listed] = useAtom(listed_atom);
  const [gridDimensions] = useAtom(grid_dimensions_atom);
  const [gridData] = useAtom(grid_data_atom);
  const [wordList] = useAtom(word_list_atom);
  const [attachments, setAttachments] = useAtom(attachments_atom);
  const [image_id, setImageId] = useAtom(image_id_atom);
  const [, setImageBaseline] = useAtom(image_baseline_atom);
  const { beginSave, markSaved } = useEditorHistoryActions();
  const saveSnapRef = useRef<{
    attachments: EditableAttachment[];
    image_id: number | null;
  } | null>(null);

  const update_mut = useMutation(
    // SAFETY: the callbacks below only run after the mutation settles (async),
    // never during render — the ref is read/written from mutation lifecycle code.
    // oxlint-disable-next-line react/refs
    trpc.crossword.update_puzzle.mutationOptions({
      onSuccess: async (data) => {
        toast.success('Puzzle updated successfully');

        const submitted = saveSnapRef.current;
        const baseAttachments = submitted?.attachments ?? attachments;
        const savedImageId = submitted?.image_id ?? image_id;

        const updatedAttachments =
          data.newly_added_index_ids.length > 0
            ? baseAttachments.map((val, i) => {
                const elm = data.newly_added_index_ids.find(({ index }) => index === i);
                return elm ? { ...val, id: elm.id } : val;
              })
            : baseAttachments;

        if (data.newly_added_index_ids.length > 0) {
          setAttachments(updatedAttachments);
        }

        setImageBaseline(savedImageId);
        setImageId(savedImageId);
        markSaved(
          data.newly_added_index_ids.length > 0 ? { attachments: updatedAttachments } : undefined
        );
        saveSnapRef.current = null;

        void queryClient.invalidateQueries({ queryKey: ['crossword_list'] });
        await router.invalidate();
      },
      onError(err) {
        saveSnapRef.current = null;
        toast.error(err.message || 'Failed to update puzzle');
      }
    })
  );

  const delete_mut = useMutation(
    trpc.crossword.delete_puzzle.mutationOptions({
      onSuccess: async () => {
        toast.success('Puzzle deleted');
        void queryClient.invalidateQueries({ queryKey: ['crossword_list'] });
        await router.invalidate();
        navigate({ href: '/padajala/list' });
      },
      onError() {
        toast.error('Failed to delete puzzle');
      }
    })
  );

  const handleSave = () => {
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    const analysis = analyzeWordPlacements(gridData, wordList);
    if (listed && !analysis.canList) {
      toast.error('Cannot list until every word has exactly one valid placement');
      return;
    }

    const wordsToSave = wordList.filter((w) => w.word.trim().length > 0);

    const missingClue = wordsToSave.find((w) => w.added && w.description.trim().length === 0);
    if (missingClue) {
      toast.error(`Add a clue for "${missingClue.word.trim().toUpperCase()}"`);
      return;
    }

    const missingDevanagari = wordsToSave.find((w) => w.added && w.word_dev.trim().length === 0);
    if (missingDevanagari) {
      toast.error(`Add a Devanagari word for "${missingDevanagari.word.trim().toUpperCase()}"`);
      return;
    }

    const data = {
      puzzle_id: puzzle.id,
      puzzle_slug: puzzle.slug,
      image_id,
      puzzle_data: {
        title: title.trim(),
        description: description.trim(),
        listed,
        grid_dimensions: gridDimensions,
        grid_data: gridData,
        word_list: wordsToSave.map((w) => ({
          word: w.word,
          word_dev: w.word_dev.trim(),
          location: w.location,
          direction: w.direction,
          description: w.description.trim(),
          added: w.added
        })),
        attachments
      }
    };

    const parse = crossword_update_input_schema.safeParse(data);
    if (!parse.success) {
      console.error(parse.error);
      const firstIssue = parse.error.issues[0];
      const pathIndex = z.number().int().safeParse(firstIssue?.path[2]);
      const wordIndex =
        firstIssue?.path[0] === 'puzzle_data' &&
        firstIssue.path[1] === 'word_list' &&
        pathIndex.success
          ? pathIndex.data
          : null;
      const field = firstIssue?.path.at(-1);
      const wordLabel =
        wordIndex != null
          ? wordsToSave[wordIndex]?.word.trim().toUpperCase() || `Word ${wordIndex + 1}`
          : null;

      if (field === 'word_dev' && wordLabel) {
        toast.error(`Add a Devanagari word for "${wordLabel}"`);
        return;
      }
      if (field === 'description' && wordLabel) {
        toast.error(`Add a clue for "${wordLabel}"`);
        return;
      }
      toast.error(firstIssue?.message || 'Failed to update puzzle, fix the entered data');
      return;
    }

    beginSave();
    saveSnapRef.current = { attachments, image_id };
    update_mut.mutate(parse.data);
  };

  return (
    <>
      <EditorActionDock onSave={handleSave} isSaving={update_mut.isPending} />

      <div className="mx-2 mt-2 flex items-center justify-end sm:mx-4">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button className="flex gap-1 px-1 py-0 text-sm" variant="destructive" />}
          >
            <MdDeleteOutline className="text-base" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this puzzle? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => delete_mut.mutate({ id: puzzle.id, slug: puzzle.slug })}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};
