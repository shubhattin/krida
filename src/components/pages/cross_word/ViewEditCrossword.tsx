'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { atom, useAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Info, Pencil } from 'lucide-react';
import { FiSave } from 'react-icons/fi';
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
import { client_q } from '~/api/client';
import type { CrossordPuzzle, CrossordPuzzleGridCell, CrossWordPuzzleWord } from '~/db/schema_zod';
import { crossword_update_input_schema } from '~/db/crossword_shared';
import {
  ATTACHMENT_TYPE_NAMES,
  type attachment_schema,
  type image_schema
} from '~/db/db_shared_vals';
import type { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
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
import { invalidatePage } from '~/tools/invalidate_nextjs_server_route';
import { CrosswordSlugField } from '~/components/pages/cross_word/EditCrosswordSlugDialog';
import { PuzzleCardImageSection } from '~/components/pages/puzzle/PuzzleCardImageSection';

type EditableWord = {
  id: string;
  word: string;
  description: string;
  location: [number, number];
  direction: CrossWordPuzzleWord['direction'];
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
    description: w.description,
    location: w.location,
    direction: w.direction
  }));
}

function editableWordsComparable(words: EditableWord[]) {
  return words.map(({ word, description, location, direction }) => ({
    word,
    description,
    location,
    direction
  }));
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-2 py-4 sm:px-4">
      <CrosswordSlugField
        slug={puzzle.slug}
        puzzleId={puzzle.id}
        onSlugUpdated={(slug) => setPuzzle((prev) => ({ ...prev, slug }))}
      />
      <TitleField />
      <DescriptionField />
      <AttachmentsEditor />
      <CrosswordPuzzleImageSection puzzleId={puzzle.id} />
      <div className="flex flex-wrap items-center gap-6">
        <ListedSwitch />
        <DimensionsField />
      </div>
      <WordListEditor />
      <PlacementAndGrid />
      <SaveControls puzzle={puzzle} />
    </div>
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
      words={wordList.map((w) => w.word).filter((w) => w.trim().length > 0)}
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
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="crossword-title" className="text-lg font-semibold">
        Title
      </Label>
      <Input
        id="crossword-title"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        className="max-w-xl text-base"
      />
    </div>
  );
};

const DescriptionField = () => {
  const [description, setDescription] = useAtom(description_atom);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="crossword-description" className="text-lg font-semibold">
        Description
      </Label>
      <Textarea
        id="crossword-description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
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
              if (value) onUpdate('type', value as EditableAttachment['type']);
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

const WordListEditor = () => {
  const [wordList, setWordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);

  const analysis = useMemo(() => analyzeWordPlacements(gridData, wordList), [gridData, wordList]);

  const addWord = () =>
    setWordList((prev) => [
      ...prev,
      {
        id: createEditableWordId(),
        word: '',
        description: '',
        location: [0, 0],
        direction: 'horizontal'
      }
    ]);

  const removeWord = (index: number) => setWordList((prev) => prev.filter((_, i) => i !== index));

  const updateWord = (index: number, patch: Partial<EditableWord>) =>
    setWordList((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-lg font-semibold">Words & clues</Label>
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {wordList.map((item, idx) => {
            const status = analysis.statuses[idx];
            const startLabel =
              status?.status === 'ok'
                ? `${formatGridCellRef(status.placement.location[0], status.placement.location[1])} ${
                    status.placement.direction === 'horizontal' ? '→' : '↓'
                  }`
                : '—';

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-start gap-2 overflow-hidden sm:flex-nowrap"
              >
                <Input
                  value={item.word}
                  onChange={(e) =>
                    updateWord(idx, {
                      word: e.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, '')
                    })
                  }
                  placeholder="WORD"
                  className="w-36 font-mono uppercase sm:w-44"
                />
                <Input
                  value={item.description}
                  onChange={(e) => updateWord(idx, { description: e.currentTarget.value })}
                  placeholder="Clue / description"
                  className="min-w-0 flex-1"
                />
                <span
                  className="inline-flex h-9 min-w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 px-2 font-mono text-xs text-muted-foreground"
                  title={
                    status?.status === 'ok'
                      ? `Starts at ${formatGridCellRef(status.placement.location[0], status.placement.location[1])} (${status.placement.direction})`
                      : 'Start cell resolved when the word has a unique placement'
                  }
                >
                  {startLabel}
                </span>
                <Button
                  variant="ghost"
                  className="p-0 text-red-500 has-[>svg]:p-0 dark:text-red-400"
                  onClick={() => removeWord(idx)}
                >
                  <IoMdClose className="inline-block" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <Button variant="outline" size="sm" className="w-fit gap-1" onClick={addWord}>
          <IoMdAdd className="text-lg" /> Add Word
        </Button>
      </div>
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
                letter — mark at least one with the green checkbox.
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {analysis.hasAllValid && analysis.noVisibleHintWords.length === 0 && (
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

  const toggleVisible = (r: number, c: number, checked: boolean) => {
    const cell = gridData[r]?.[c];
    if (!cell || !cellHasLetter(cell)) return;
    updateCell(r, c, { ...cell, is_visible: checked });
  };

  const focusCellInput = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-grid-r="${r}"][data-grid-c="${c}"]`
    );
    if (!el) return false;
    el.focus();
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

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-lg font-semibold">Grid</Label>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-emerald-500" />
          Prefilled (visible)
          <Popover>
            <PopoverTrigger
              render={<Info className="size-3.5 text-muted-foreground" />}
              nativeButton={false}
            />
            <PopoverContent className="max-w-xs text-xs">
              When checked, this letter is shown to the player at the start of a new game as a hint.
              Empty cells are blocked boxes — type a letter to make a playable cell.
            </PopoverContent>
          </Popover>
        </span>
      </div>
      <div
        ref={gridRef}
        className="grid w-full max-w-3xl gap-1.5"
        style={{ gridTemplateColumns: `1.5rem repeat(${cols}, minmax(0, 1fr))` }}
      >
        {/* Corner spacer + column number headers */}
        <div aria-hidden className="h-5" />
        {Array.from({ length: cols }, (_, c) => (
          <div
            key={`col-h-${c}`}
            className="flex h-5 items-center justify-center font-mono text-[10px] text-muted-foreground sm:text-xs"
          >
            {colIndexToNumberLabel(c)}
          </div>
        ))}

        {gridData.map((row, r) => (
          <div key={`row-${r}`} className="contents">
            <div className="flex items-center justify-center font-mono text-[10px] text-muted-foreground sm:text-xs">
              {rowIndexToLetter(r)}
            </div>
            {row.map((cell, c) => {
              const isBox = isBoxCell(cell);
              const hasLetter = cellHasLetter(cell);
              const isOccupied = occupiedCells.has(`${r},${c}`);
              const isVisible = hasLetter && cell.is_visible;
              const cellRef = formatGridCellRef(r, c);

              return (
                <div
                  key={`${r}-${c}`}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded border p-0.5 transition-all',
                    isBox && 'border-muted-foreground/30 bg-muted/60',
                    !isBox &&
                      isVisible &&
                      'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
                    !isBox && !isVisible && 'border-border bg-background',
                    isOccupied && 'ring-1 ring-blue-400 ring-offset-1 dark:ring-blue-500'
                  )}
                >
                  <Input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    data-grid-r={r}
                    data-grid-c={c}
                    value={cell.text}
                    onChange={(e) => setLetter(r, c, e.currentTarget.value)}
                    onKeyDown={(e) => handleCellKeyDown(r, c, e)}
                    className="h-8 px-0 text-center font-mono text-sm uppercase"
                    maxLength={2}
                    aria-label={
                      isBox ? `Blocked cell ${cellRef} — type a letter to open` : `Cell ${cellRef}`
                    }
                  />
                  <div className="flex items-center gap-1">
                    <label
                      className="inline-flex items-center"
                      title={
                        hasLetter
                          ? 'Prefilled / visible'
                          : 'Add a letter before marking as prefilled'
                      }
                    >
                      <Checkbox
                        checked={isVisible}
                        disabled={!hasLetter}
                        onCheckedChange={(checked) => toggleVisible(r, c, checked === true)}
                        className="border-emerald-400 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500"
                        aria-label={`Visible cell ${cellRef}`}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const SaveControls = ({ puzzle }: { puzzle: ViewEditCrosswordProps['puzzle'] }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [title] = useAtom(title_atom);
  const [description] = useAtom(description_atom);
  const [listed] = useAtom(listed_atom);
  const [gridDimensions] = useAtom(grid_dimensions_atom);
  const [gridData] = useAtom(grid_data_atom);
  const [wordList] = useAtom(word_list_atom);
  const [attachments, setAttachments] = useAtom(attachments_atom);
  const [image_id, setImageId] = useAtom(image_id_atom);
  const [image_baseline, setImageBaseline] = useAtom(image_baseline_atom);

  const initialRef = useRef<{
    title: string;
    description: string;
    listed: boolean;
    gridDimensions: [number, number];
    gridData: CrossordPuzzleGridCell[][];
    wordList: EditableWord[];
    attachments: EditableAttachment[];
  }>({
    title: puzzle.title,
    description: puzzle.description,
    listed: puzzle.listed,
    gridDimensions: puzzle.grid_dimensions,
    gridData: puzzle.grid_data,
    wordList: toEditableWords(puzzle.word_list),
    attachments: puzzle.attachments
  });

  const update_mut = client_q.crossword.update_puzzle.useMutation({
    onSuccess: (data) => {
      toast.success('Puzzle updated successfully');

      const updatedAttachments =
        data.newly_added_index_ids.length > 0
          ? attachments.map((val, i) => {
              const elm = data.newly_added_index_ids.find(({ index }) => index === i);
              return elm ? { ...val, id: elm.id } : val;
            })
          : attachments;

      if (data.newly_added_index_ids.length > 0) {
        setAttachments(updatedAttachments);
      }

      setImageBaseline(image_id);
      setImageId(image_id);

      initialRef.current = {
        title,
        description,
        listed,
        gridDimensions,
        gridData,
        wordList,
        attachments: updatedAttachments
      };
      void queryClient.invalidateQueries({ queryKey: ['crossword_list'] });
      void invalidatePage('/padajala');
      void invalidatePage('/padajala/list');
      void invalidatePage('/padajala/puzzles');
      void invalidatePage(`/padajala/edit/${puzzle.id}`);
      void invalidatePage(`/padajala/${puzzle.slug}`);
    },
    onError(err) {
      toast.error(err.message || 'Failed to update puzzle');
    }
  });

  const delete_mut = client_q.crossword.delete_puzzle.useMutation({
    onSuccess: () => {
      toast.success('Puzzle deleted');
      void queryClient.invalidateQueries({ queryKey: ['crossword_list'] });
      void invalidatePage('/padajala');
      void invalidatePage('/padajala/list');
      void invalidatePage('/padajala/puzzles');
      router.push('/padajala/list');
    },
    onError() {
      toast.error('Failed to delete puzzle');
    }
  });

  const isEdited = useMemo(() => {
    return (
      title !== initialRef.current.title ||
      description !== initialRef.current.description ||
      listed !== initialRef.current.listed ||
      JSON.stringify(gridDimensions) !== JSON.stringify(initialRef.current.gridDimensions) ||
      JSON.stringify(gridData) !== JSON.stringify(initialRef.current.gridData) ||
      JSON.stringify(editableWordsComparable(wordList)) !==
        JSON.stringify(editableWordsComparable(initialRef.current.wordList)) ||
      JSON.stringify(attachments) !== JSON.stringify(initialRef.current.attachments) ||
      image_id !== image_baseline
    );
  }, [
    title,
    description,
    listed,
    gridDimensions,
    gridData,
    wordList,
    attachments,
    image_id,
    image_baseline
  ]);

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

    const missingClue = wordList.find(
      (w) => w.word.trim().length > 0 && w.description.trim().length === 0
    );
    if (missingClue) {
      toast.error(`Add a clue for "${missingClue.word.trim().toUpperCase()}"`);
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
        word_list: wordList
          .filter((w) => w.word.trim().length > 0)
          .map((w) => ({
            word: w.word,
            location: w.location,
            direction: w.direction,
            description: w.description.trim()
          })),
        attachments
      }
    };

    const parse = crossword_update_input_schema.safeParse(data);
    if (parse.success) {
      update_mut.mutate(parse.data);
    } else {
      console.error(parse.error);
      toast.error('Failed to update puzzle, fix the entered data');
    }
  };

  return (
    <div className="mx-2 mt-2 flex items-center justify-between sm:mx-4">
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              disabled={!isEdited || update_mut.isPending}
              className="flex text-lg"
              variant="outline"
            />
          }
        >
          <FiSave className="text-lg" /> {!update_mut.isPending ? 'Save' : 'Saving...'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save your changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
  );
};
