'use client';

import { z } from 'zod';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { useTRPC } from '~/api/client';
import { toast } from 'sonner';
import { IoMdAdd, IoMdClose } from 'react-icons/io';
import { atom, useAtom } from 'jotai';
import { MdDeleteOutline, MdDragIndicator } from 'react-icons/md';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { Info, ArrowRight, ExternalLink } from 'lucide-react';
import { PuzzleCardImageSection } from '~/components/pages/puzzle/PuzzleCardImageSection';
import { EditorActionDock } from '~/components/pages/puzzle/EditorActionDock';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  findAllTraversals,
  getOccupiedCells,
  type Traversal,
  type Coordinate
} from '~/tools/puzzle/puzzle_tools';
import { cn } from '~/lib/utils';
import { useHydrateAtoms } from 'jotai/utils';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import {
  puzzle_editor_schema as _puzzle_schema,
  attachment_schema,
  ATTACHMENT_TYPE_NAMES,
  puzzle_update_input_schema,
  type PadavaliWordCandidate
} from '~/db/db_shared_vals';
import { SlugField } from '~/components/pages/padavali/EditSlugDialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectContent
} from '~/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EditorHistoryProvider,
  useEditorHistoryActions,
  useHistoryTextField
} from '~/hooks/useEditorHistory';
import { padavaliActiveWords } from '~/util/puzzle/word_list';
import { PadavaliWordListEditor } from '~/components/pages/padavali/PadavaliWordListEditor';
import { PadavaliLayoutGenerator } from '~/components/pages/padavali/PadavaliLayoutGenerator';
import {
  buildCellWordColorMap,
  cellWordTintAppearance,
  getActiveNonEmptyWordSlotIndices,
  getWordColorPair,
  type CellWordColorInfo
} from '~/util/puzzle/word_colors';

const ATTACHMENT_TYPE_ITEMS = [
  { label: 'Select attachment type', value: null },
  ...Object.entries(ATTACHMENT_TYPE_NAMES).map(([key, value]) => ({
    label: value,
    value: key
  }))
];

function createPuzzleSchema() {
  return _puzzle_schema
    .extend({
      id: z.number().int()
    })
    .omit({
      attachments: true
    })
    .and(
      z.object({
        attachments: attachment_schema
          .omit({ id: true })
          .extend({
            id: z.number().int().nullable()
          })
          .array()
      })
    );
}

export const puzzleSchema = createPuzzleSchema();
export type Puzzle = z.infer<typeof puzzleSchema>;

const BASE_SCRIPT = 'Devanagari';

const title_atom = atom<string>('');
const word_list_atom = atom<PadavaliWordCandidate[]>([]);
const grid_data_atom = atom<string[][]>([]);
const listed_atom = atom<boolean>(false);
const description_atom = atom<string>('');
const lipi_lekhika_active_atom = atom<boolean>(true);
const attachments_atom = atom<Puzzle['attachments']>([]);
/** null = no image; undefined = not yet hydrated (unused); number = image_id */
const image_id_atom = atom<number | null>(null);
/** Persisted puzzle image_id baseline for unsaved-change detection */
const image_baseline_atom = atom<number | null>(null);
/** The current image s3_key + dimensions as fetched (kept in sync with image_id changes) */
const image_info_atom = atom<{ id: number; s3_key: string; width: number; height: number } | null>(
  null
);

const PADAVALI_HISTORY_ATOMS = {
  title: title_atom,
  description: description_atom,
  listed: listed_atom,
  word_list: word_list_atom,
  grid_data: grid_data_atom,
  attachments: attachments_atom,
  image_id: image_id_atom,
  image_info: image_info_atom
};

export type ViewEditProps = {
  word_puzzle: Puzzle;
};

const ViewEditPuzzle = ({ word_puzzle: initialWordPuzzle }: ViewEditProps) => {
  const [word_puzzle, setWordPuzzle] = useState(initialWordPuzzle);

  useHydrateAtoms([
    [title_atom, word_puzzle.title],
    [
      word_list_atom,
      word_puzzle.word_list.map((entry) => ({
        word: entry.word,
        added: entry.added !== false
      }))
    ],
    [grid_data_atom, word_puzzle.grid_data.map((row) => [...row])],
    [listed_atom, word_puzzle.listed],
    [description_atom, word_puzzle.description],
    [lipi_lekhika_active_atom, true],
    [attachments_atom, word_puzzle.attachments],
    [image_id_atom, word_puzzle.image?.id ?? null],
    [image_baseline_atom, word_puzzle.image?.id ?? null],
    [image_info_atom, word_puzzle.image ?? null]
  ]);

  return (
    <EditorHistoryProvider atoms={PADAVALI_HISTORY_ATOMS}>
      <Card className="space-y-1.5 pb-28">
        <CardContent>
          <div className="space-y-4">
            <LipiLekhikaSwitch />
            <SlugField
              slug={word_puzzle.slug}
              puzzleId={word_puzzle.id}
              onSlugUpdated={(slug) => setWordPuzzle((prev) => ({ ...prev, slug }))}
            />
            <Title />
            <ListedSwitch slug={word_puzzle.slug} />
            <Description />
            <Attachments />
            <WordList gridDimensions={word_puzzle.grid_dimensions} />
            <TraversalAndGridData grid_dimensions={word_puzzle.grid_dimensions} />
            <PuzzleImageSection word_puzzle={word_puzzle} />
            <SaveButton word_puzzle={word_puzzle} />
          </div>
        </CardContent>
      </Card>
    </EditorHistoryProvider>
  );
};

const Title = () => {
  const ctx = createTypingContext(BASE_SCRIPT);
  const [title, setTitle] = useAtom(title_atom);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);
  const historyField = useHistoryTextField();

  useEffect(() => {
    void ctx.ready;
  }, [ctx]);

  return (
    <div>
      <Label className="block font-medium">
        <span className="text-xl font-bold">Title</span>
        <Input
          type="text"
          className="lg:1/5 mt-1 block w-3/5 text-lg font-semibold sm:w-2/5"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(
              ctx,
              e,
              (newValue) => setTitle(newValue),
              lipi_lekhika_active
            )
          }
          onFocus={historyField.onFocus}
          onBlur={() => {
            ctx.clearContext();
            historyField.onBlur();
          }}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
        />
      </Label>
    </div>
  );
};

// Sortable item component for individual attachments
const SortableAttachmentItem = ({
  attachment,
  index,
  onUpdate,
  onRemove
}: {
  attachment: Puzzle['attachments'][0];
  index: number;
  onUpdate: (field: string, value: string, event: FormEvent<HTMLInputElement> | null) => void;
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

  const ctx = createTypingContext(BASE_SCRIPT);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);
  const historyField = useHistoryTextField();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'space-y-2 rounded-md border p-3',
        isDragging && 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950'
      )}
    >
      <div className="flex items-center">
        <div className="flex items-center gap-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-grab touch-none"
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
        <Button variant="ghost" size="icon" className="ml-auto" onClick={onRemove}>
          <IoMdClose className="size-4" />
        </Button>
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center space-x-1">
          <Label>Type</Label>
          <Select
            items={ATTACHMENT_TYPE_ITEMS}
            value={attachment.type}
            onValueChange={(value) => {
              if (value) onUpdate('type', value, null);
            }}
          >
            <SelectTrigger className="w-40">
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
        <div className="flex items-center justify-center space-x-1">
          <Label>URL</Label>
          <Input
            type="text"
            className="w-64 text-sm"
            value={attachment.url}
            onInput={(e) => onUpdate('url', e.currentTarget.value, null)}
            onFocus={historyField.onFocus}
            onBlur={historyField.onBlur}
          />
        </div>
      </div>
      <div className="flex items-center justify-center space-x-2">
        <Label>
          Title <span className="text-xs text-gray-500 dark:text-gray-400">Optional</span>
        </Label>
        <Input
          type="text"
          className="w-full text-sm"
          value={attachment.title ?? ''}
          onChange={(e) => onUpdate('title', e.currentTarget.value, e)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(
              ctx,
              e,
              (newValue) => onUpdate('title', newValue, e),
              lipi_lekhika_active
            )
          }
          onFocus={historyField.onFocus}
          onBlur={() => {
            ctx.clearContext();
            historyField.onBlur();
          }}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
        />
      </div>
    </div>
  );
};

const Attachments = () => {
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
    setAttachments((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // Reassign order_index after removal
      return filtered.map((attachment, i) => ({
        ...attachment,
        order_index: i + 1
      }));
    });
  };

  const updateAttachment = (index: number, field: string, value: string) => {
    setAttachments((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAttachments((items) => {
        const oldIndex = items.findIndex((_, i) => `attachment-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `attachment-${i}` === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Reassign order_index after reordering
        return newItems.map((attachment, i) => ({
          ...attachment,
          order_index: i + 1
        }));
      });
    }
  };

  // useEffect(() => {
  //   console.log(attachments);
  // }, [attachments]);

  return (
    <Accordion className="w-fit">
      <AccordionItem value="item-1">
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

const LipiLekhikaSwitch = () => {
  const [lipi_lekhika_active, setLipiLekhikaActive] = useAtom(lipi_lekhika_active_atom);

  return (
    <div className="flex justify-center">
      <Label className="inline-flex items-center justify-center gap-2 font-medium">
        <Switch
          checked={lipi_lekhika_active}
          onCheckedChange={setLipiLekhikaActive}
          className="-mt-1"
        />
        <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
        <span className="text-base font-bold">Devanagari</span>
      </Label>
    </div>
  );
};

const getTraversalsInfo = (
  gridData: string[][],
  wordList: PadavaliWordCandidate[],
  gridDimensions: [number, number]
) => {
  const validWords = padavaliActiveWords(wordList).filter((word) => word.trim() !== '');
  const traversalsMap = findAllTraversals(gridData, gridDimensions, validWords);
  return {
    validWords,
    traversalsMap,
    occupiedCells: getOccupiedCells(traversalsMap)
  };
};

// New function to detect cell conflicts
const getCellConflicts = (
  traversalsMap: Map<number, Traversal[]>,
  validWords: string[]
): {
  cellPosition: Coordinate;
  conflictingWords: { wordIndex: number; word: string; traversalIndex: number }[];
}[] => {
  const cellUsageMap = new Map<
    string,
    { wordIndex: number; word: string; traversalIndex: number }[]
  >();

  // Track which words use each cell
  traversalsMap.forEach((traversals, wordIndex) => {
    traversals.forEach((traversal, traversalIndex) => {
      traversal.forEach(([r, c]) => {
        const cellKey = `${r},${c}`;
        if (!cellUsageMap.has(cellKey)) {
          cellUsageMap.set(cellKey, []);
        }
        cellUsageMap.get(cellKey)!.push({
          wordIndex,
          word: validWords[wordIndex],
          traversalIndex
        });
      });
    });
  });

  // Find cells with conflicts (used by multiple words)
  const conflicts: {
    cellPosition: Coordinate;
    conflictingWords: { wordIndex: number; word: string; traversalIndex: number }[];
  }[] = [];

  cellUsageMap.forEach((wordUsages, cellKey) => {
    if (wordUsages.length > 1) {
      const [rStr, cStr] = cellKey.split(',');
      conflicts.push({
        cellPosition: [Number(rStr), Number(cStr)],
        conflictingWords: wordUsages
      });
    }
  });

  return conflicts;
};

type WordTrail = {
  slotIndex: number;
  path: Coordinate[];
};

/** Unique single-path placements only — same source as cell tints. */
function getUniqueWordTrails(
  uniqueTraversalsMap: Map<number, Traversal[]>,
  slotIndices: readonly number[]
): WordTrail[] {
  const trails: WordTrail[] = [];
  for (const [validIdx, traversals] of uniqueTraversalsMap) {
    const path = traversals[0];
    const slotIndex = slotIndices[validIdx];
    if (!path || path.length < 2 || slotIndex === undefined) continue;
    // SAFETY: traversal paths are [row, col] pairs by the Traversal contract
    trails.push({ slotIndex, path: path.map(([r, c]) => [r, c] as Coordinate) });
  }
  return trails;
}

const TraversalAndGridData = ({ grid_dimensions }: { grid_dimensions: [number, number] }) => {
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);

  const { traversalsMap, validWords, occupiedCells } = getTraversalsInfo(
    gridData,
    wordList,
    grid_dimensions
  );

  const slotIndices = getActiveNonEmptyWordSlotIndices(wordList);
  const uniqueTraversalsMap = new Map(
    [...traversalsMap.entries()].filter(([, traversals]) => traversals.length === 1)
  );
  const cellColorMap =
    gridData.length === 0 || wordList.length === 0
      ? new Map<string, CellWordColorInfo>()
      : buildCellWordColorMap(uniqueTraversalsMap, slotIndices);
  const wordTrails =
    gridData.length === 0 || wordList.length === 0
      ? []
      : getUniqueWordTrails(uniqueTraversalsMap, slotIndices);

  return (
    <>
      <TraversalAnalysis
        grid_dimensions={grid_dimensions}
        traversalsMap={traversalsMap}
        validWords={validWords}
        occupiedCells={occupiedCells}
      />
      <GridData
        grid_dimensions={grid_dimensions}
        cellColorMap={cellColorMap}
        wordTrails={wordTrails}
      />
    </>
  );
};

type TraversalWarning = {
  wordIndex: number;
  word: string;
  traversalCount: number;
  type: 'none' | 'multiple' | 'duplicate';
  paths?: Coordinate[][];
  duplicateIndices?: number[];
};

function countWordIndices(validWords: string[]) {
  const wordCountMap = new Map<string, number[]>();
  validWords.forEach((word, index) => {
    if (!wordCountMap.has(word)) {
      wordCountMap.set(word, []);
    }
    wordCountMap.get(word)!.push(index);
  });
  return wordCountMap;
}

/** Add a single warning per word that appears multiple times in the word list. */
function addDuplicateWarnings(warnings: TraversalWarning[], validWords: string[]) {
  const wordCountMap = countWordIndices(validWords);
  const processedDuplicates = new Set<string>();
  wordCountMap.forEach((indices, word) => {
    if (indices.length > 1 && !processedDuplicates.has(word)) {
      processedDuplicates.add(word);
      // Add warning for the first occurrence, referencing all duplicates
      warnings.push({
        wordIndex: indices[0],
        word: word,
        traversalCount: indices.length,
        type: 'duplicate',
        duplicateIndices: indices
      });
    }
  });
}

/** Warn for words with no traversal (not placeable) or multiple traversals. */
function addPlacementWarnings(
  warnings: TraversalWarning[],
  traversalsMap: Map<number, Traversal[]>,
  validWords: string[]
) {
  let hasAllValidWords = true;
  for (let i = 0; i < validWords.length; i++) {
    const traversals = traversalsMap.get(i) || [];
    if (traversals.length === 0) {
      hasAllValidWords = false;
      warnings.push({
        wordIndex: i,
        word: validWords[i],
        traversalCount: 0,
        type: 'none'
      });
    } else if (traversals.length > 1) {
      warnings.push({
        wordIndex: i,
        word: validWords[i],
        traversalCount: traversals.length,
        type: 'multiple',
        paths: traversals
      });
    }
  }
  return hasAllValidWords;
}

/** Count non-empty grid letters that no valid word traverses. */
function countUncoveredLetters(gridData: string[][], occupiedCells: Set<Coordinate>) {
  const occupiedKeys = new Set<string>();
  for (const [r, c] of occupiedCells) {
    occupiedKeys.add(`${r},${c}`);
  }
  let uncoveredLetterCount = 0;
  for (let r = 0; r < gridData.length; r++) {
    const row = gridData[r]!;
    for (let c = 0; c < row.length; c++) {
      if ((row[c] ?? '').trim().length === 0) continue;
      if (!occupiedKeys.has(`${r},${c}`)) uncoveredLetterCount += 1;
    }
  }
  return uncoveredLetterCount;
}

type TraversalAnalysisResult = {
  warnings: TraversalWarning[];
  cellConflicts: ReturnType<typeof getCellConflicts>;
  hasAllValidWords: boolean;
  uncoveredLetterCount: number;
};

function emptyTraversalAnalysis(): TraversalAnalysisResult {
  return {
    warnings: [],
    cellConflicts: [],
    hasAllValidWords: false,
    uncoveredLetterCount: 0
  };
}

function analyzeTraversalGrid(
  traversalsMap: Map<number, Traversal[]>,
  validWords: string[],
  occupiedCells: Set<Coordinate>,
  gridData: string[][]
): TraversalAnalysisResult {
  if (gridData.length === 0 || validWords.length === 0) {
    return emptyTraversalAnalysis();
  }

  const warnings: TraversalWarning[] = [];

  // Get cell conflicts
  const cellConflicts = getCellConflicts(traversalsMap, validWords);

  addDuplicateWarnings(warnings, validWords);
  const hasAllValidWords = addPlacementWarnings(warnings, traversalsMap, validWords);
  const uncoveredLetterCount = countUncoveredLetters(gridData, occupiedCells);

  return {
    warnings,
    cellConflicts,
    uncoveredLetterCount,
    hasAllValidWords: hasAllValidWords && warnings.length === 0 && cellConflicts.length === 0
  };
}

const TraversalAnalysis = ({
  traversalsMap,
  validWords,
  occupiedCells
}: {
  grid_dimensions: [number, number];
  traversalsMap: Map<number, Traversal[]>;
  validWords: string[];
  occupiedCells: Set<Coordinate>;
}) => {
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);

  const analysisResult = analyzeTraversalGrid(traversalsMap, validWords, occupiedCells, gridData);

  if (gridData.length === 0 || wordList.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {analysisResult.warnings.length > 0 && (
        <motion.div
          key="warnings"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'rounded-lg border p-3',
            'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex items-start space-x-2"
          >
            <div>
              <div className={`mt-1 text-sm`}>
                {analysisResult.warnings.map((warning, idx) => (
                  <motion.div
                    key={warning.wordIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.2 }}
                    className={cn('mb-1', 'text-amber-700 dark:text-amber-300')}
                  >
                    {warning.type === 'none' ? (
                      <>
                        &quot;<span className="font-semibold">{warning.word}</span>&quot; was not
                        found on the grid.
                      </>
                    ) : warning.type === 'duplicate' ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>
                          &quot;<span className="font-semibold">{warning.word}</span>&quot; appears
                          multiple times ({warning.traversalCount}) in the word list.
                        </span>
                        <Popover>
                          <PopoverTrigger
                            render={
                              <Info className="-mt-1 size-4.5 text-amber-600 dark:text-amber-400" />
                            }
                            nativeButton={false}
                          />
                          <PopoverContent className="max-w-xs" align="center">
                            <div className="text-xs">
                              <span className="font-semibold">Positions:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {warning.duplicateIndices?.map((index, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                  >
                                    {index + 1}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>
                          &quot;<span className="font-semibold">{warning.word}</span>&quot; has
                          multiple paths ({warning.traversalCount}).
                        </span>
                        <Popover>
                          <PopoverTrigger
                            render={
                              <Info className="-mt-1 size-4.5 text-amber-600 dark:text-amber-400" />
                            }
                            nativeButton={false}
                          />
                          <PopoverContent className="max-w-xs" align="center">
                            {warning.paths?.map((path, pIdx) => (
                              <div key={pIdx} className="flex items-center space-x-1 text-xs">
                                <span className="font-semibold">Path {pIdx + 1}:</span>
                                <div className="flex items-center space-x-1">
                                  {path.map(([r, c], idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-center space-x-1"
                                    >
                                      <span className="font-semibold">
                                        {r + 1},{c + 1}
                                      </span>
                                      {idx < path.length - 1 && (
                                        <ArrowRight className="-mt-1 size-3" />
                                      )}
                                    </div>
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
            </div>
          </motion.div>
        </motion.div>
      )}

      {analysisResult.cellConflicts.length > 0 && (
        <motion.div
          key="cellConflicts"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'rounded-lg border p-3',
            'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
          )}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex items-start space-x-2"
          >
            <div>
              <div className="mb-2 text-sm font-semibold text-red-800 dark:text-red-200">
                Cell Conflicts ({analysisResult.cellConflicts.length})
              </div>
              <div className={`mt-1 text-sm`}>
                {analysisResult.cellConflicts.map((conflict, idx) => (
                  <motion.div
                    key={`${conflict.cellPosition[0]}-${conflict.cellPosition[1]}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.2 }}
                    className={cn('mb-2', 'text-red-700 dark:text-red-300')}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        Cell{' '}
                        <span className="font-semibold">
                          ({conflict.cellPosition[0] + 1},{conflict.cellPosition[1] + 1})
                        </span>{' '}
                        is used by multiple words
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {conflict.conflictingWords.map((wordInfo, widx) => (
                        <span
                          key={widx}
                          className="rounded bg-red-100 px-1.5 pt-1 pb-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-200"
                        >
                          {wordInfo.word}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {analysisResult.uncoveredLetterCount > 0 && (
        <motion.div
          key="uncovered-letters"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
        >
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <span>
              Some cells on the grid have letters that aren&apos;t covered by any word
              {analysisResult.uncoveredLetterCount > 1
                ? ` (${analysisResult.uncoveredLetterCount})`
                : ''}
              .
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

      {analysisResult.hasAllValidWords && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
            className="flex items-center space-x-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3, type: 'spring' }}
              className="h-2 w-2 shrink-0 rounded-full bg-green-500"
            ></motion.div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              All words are placed correctly!
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const WordList = ({ gridDimensions }: { gridDimensions: [number, number] }) => {
  const [wordList, setWordList] = useAtom(word_list_atom);
  const [, setGridData] = useAtom(grid_data_atom);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);
  const { commit } = useEditorHistoryActions();

  const addWord = () => {
    setWordList((prev) => [...prev, { word: '', added: true }]);
    commit();
  };
  const removeWord = (index: number) => {
    setWordList((prev) => prev.filter((_, i) => i !== index));
    commit();
  };
  const updateWord = (index: number, value: string) => {
    setWordList((prev) => prev.map((w, i) => (i === index ? { ...w, word: value } : w)));
  };
  const toggleAdded = (index: number, added: boolean) => {
    setWordList((prev) => prev.map((w, i) => (i === index ? { ...w, added } : w)));
    commit();
  };

  return (
    <PadavaliWordListEditor
      wordList={wordList}
      gridDimensions={gridDimensions}
      lipiLekhikaActive={lipi_lekhika_active}
      onAddWord={addWord}
      onRemoveWord={removeWord}
      onUpdateWord={updateWord}
      onToggleAdded={toggleAdded}
      addedWordsActions={
        <PadavaliLayoutGenerator
          wordList={wordList}
          gridDimensions={gridDimensions}
          onApply={(layout) => {
            setGridData(layout.gridData);
            if (layout.omittedSlotIndices.length > 0) {
              const omitted = new Set(layout.omittedSlotIndices);
              setWordList((prev) =>
                prev.map((entry, index) =>
                  omitted.has(index) ? { ...entry, added: false } : entry
                )
              );
            }
            commit();
          }}
        />
      }
    />
  );
};

const GridData = ({
  grid_dimensions,
  cellColorMap,
  wordTrails
}: {
  grid_dimensions: [number, number];
  cellColorMap: Map<string, CellWordColorInfo>;
  wordTrails: WordTrail[];
}) => {
  const [gridData, setGridData] = useAtom(grid_data_atom);
  const [rows, cols] = grid_dimensions;
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);
  const historyField = useHistoryTextField();
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellCenters, setCellCenters] = useState<Record<string, { x: number; y: number }>>({});
  const lastGridSizeRef = useRef({ width: 0, height: 0 });

  // Measure cell centers for SVG connector trails (same approach as GameGrid / landing demo)
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const syncLayout = () => {
      const parentRect = el.getBoundingClientRect();
      const rounded = {
        width: Math.round(parentRect.width),
        height: Math.round(parentRect.height)
      };
      if (rounded.width === 0 || rounded.height === 0) return;

      const centers: Record<string, { x: number; y: number }> = {};
      const cells = el.querySelectorAll<HTMLElement>('input[data-grid-r][data-grid-c]');
      for (const cell of cells) {
        const r = cell.dataset.gridR;
        const c = cell.dataset.gridC;
        if (r === undefined || c === undefined) continue;
        const cellRect = cell.getBoundingClientRect();
        centers[`${r}-${c}`] = {
          x: cellRect.left + cellRect.width / 2 - parentRect.left,
          y: cellRect.top + cellRect.height / 2 - parentRect.top
        };
      }

      const sizeChanged =
        rounded.width !== lastGridSizeRef.current.width ||
        rounded.height !== lastGridSizeRef.current.height;
      lastGridSizeRef.current = rounded;
      // Always refresh when trails/grid content change; size gate only skips identical resize noise
      if (sizeChanged || Object.keys(centers).length > 0) {
        setCellCenters(centers);
      }
    };

    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncLayout();
      });
    };

    syncLayout();
    const observer = new ResizeObserver(scheduleSync);
    observer.observe(el);
    window.addEventListener('resize', scheduleSync, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', scheduleSync);
    };
  }, [gridData, rows, cols]);

  const buildPoints = (path: Coordinate[]) =>
    path
      .map(([r, c]) => {
        const center = cellCenters[`${r}-${c}`];
        return center ? `${center.x},${center.y}` : null;
      })
      .filter((p): p is string => p !== null)
      .join(' ');

  const updateCell = (r: number, c: number, value: string) => {
    setGridData((prev) => {
      const newGrid = prev.map((row) => [...row]);
      newGrid[r][c] = value;
      return newGrid;
    });
  };

  const ctx = createTypingContext(BASE_SCRIPT);

  const focusCellInput = (r: number, c: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(
      `input[data-grid-r="${r}"][data-grid-c="${c}"]`
    );
    if (!el) return false;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
    return true;
  };

  const moveFocus = (r: number, c: number, dRow: number, dCol: number) => {
    const nextR = r + dRow;
    const nextC = c + dCol;
    if (nextR < 0 || nextC < 0 || nextR >= rows || nextC >= cols) return;
    focusCellInput(nextR, nextC);
  };

  const handleCellKeyDown = (r: number, c: number, e: KeyboardEvent<HTMLInputElement>) => {
    clearTypingContextOnKeyDown(e, ctx);
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

  const getCellAppearance = (r: number, c: number) => {
    const tint = cellWordTintAppearance(cellColorMap.get(`${r},${c}`));
    return {
      className: cn(
        'relative z-10 rounded text-center transition-colors duration-200',
        // Focus above soft trail overlay
        'focus-visible:z-30 focus-visible:border-foreground/50',
        'focus-visible:ring-2 focus-visible:ring-foreground/55 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-background',
        'dark:focus-visible:border-white/70 dark:focus-visible:ring-white/65',
        tint.className
      ),
      style: tint.style
    };
  };

  return (
    <div>
      <Label className="mb-2 block text-lg font-semibold">Grid</Label>
      <p className="mb-2 hidden text-xs text-muted-foreground/80 sm:block">
        Navigate the grid with the arrow keys (↑ ↓ ← →). Colored trails show each word’s path order.
      </p>
      <div ref={gridRef} className="relative w-full sm:w-4/5 md:w-3/5 lg:w-2/5">
        <div
          className="relative z-10 grid w-full gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {gridData.map((row, r) =>
            row.map((cell, c) => {
              const { className, style } = getCellAppearance(r, c);
              return (
                <Input
                  key={`${r}-${c}`}
                  type="text"
                  data-grid-r={r}
                  data-grid-c={c}
                  className={className}
                  style={style}
                  minLength={1}
                  value={cell}
                  onChange={(e) => updateCell(r, c, e.currentTarget.value)}
                  onBeforeInput={(e) =>
                    handleTypingBeforeInputEvent(
                      ctx,
                      e,
                      (newValue) => updateCell(r, c, newValue),
                      lipi_lekhika_active
                    )
                  }
                  onFocus={historyField.onFocus}
                  onBlur={() => {
                    ctx.clearContext();
                    historyField.onBlur();
                  }}
                  onKeyDown={(e) => handleCellKeyDown(r, c, e)}
                />
              );
            })
          )}
        </div>
        {/* Soft path overlay — above cells but light enough to keep glyphs readable */}
        <svg
          className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
          aria-hidden
        >
          {wordTrails.map(({ slotIndex, path }) => {
            const points = buildPoints(path);
            if (!points || points.split(' ').length < 2) return null;
            const pair = getWordColorPair(slotIndex);
            return (
              <g key={`trail-${slotIndex}-${path.map(([r, c]) => `${r},${c}`).join('|')}`}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.light.swatch}
                  strokeWidth={4.5}
                  strokeOpacity={0.08}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="dark:hidden"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.light.swatch}
                  strokeWidth={1.75}
                  strokeOpacity={0.26}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="dark:hidden"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.dark.swatch}
                  strokeWidth={5}
                  strokeOpacity={0.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden dark:block"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.dark.swatch}
                  strokeWidth={2}
                  strokeOpacity={0.28}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden dark:block"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const ListedSwitch = ({ slug }: { slug: string }) => {
  const [listed, setListed] = useAtom(listed_atom);
  const listedPuzzleUrl = `/padavali/${slug}`;

  return (
    <div className="flex items-center space-x-4">
      <div className="inline-flex items-center gap-2">
        <Label className="inline-flex items-center gap-2 font-medium">
          <Switch checked={listed} onCheckedChange={setListed} />
          <span className="text-lg font-bold">Listed</span>
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              aria-label="Listed visibility info"
              className="inline-flex border-0 bg-transparent p-0"
            >
              <Info className="size-4 text-muted-foreground" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>When enabled, this puzzle will be publicly visible.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {listed ? (
        <a
          href={listedPuzzleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Listed Puzzle URL
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
};

const Description = () => {
  const [description, setDescription] = useAtom(description_atom);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);
  const historyField = useHistoryTextField();

  const ctx = createTypingContext(BASE_SCRIPT);

  return (
    <div>
      <Label className="block font-medium">
        <span className="text-lg font-bold">Description</span>
        <Input
          className="mt-1 w-full sm:w-[90%] md:w-2/3 lg:w-1/2"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(
              ctx,
              e,
              (newValue) => setDescription(newValue),
              lipi_lekhika_active
            )
          }
          onFocus={historyField.onFocus}
          onBlur={() => {
            ctx.clearContext();
            historyField.onBlur();
          }}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
          placeholder="Enter a description for the puzzle..."
          required
        />
      </Label>
    </div>
  );
};

const SaveButton = ({ word_puzzle }: { word_puzzle: Puzzle }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [title] = useAtom(title_atom);
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);
  const [attachments, setAttachments] = useAtom(attachments_atom);
  const [image_id] = useAtom(image_id_atom);
  const [, setImageBaseline] = useAtom(image_baseline_atom);
  const [listed] = useAtom(listed_atom);
  const [description] = useAtom(description_atom);
  const { beginSave, markSaved } = useEditorHistoryActions();
  const saveSnapRef = useRef<{
    attachments: Puzzle['attachments'];
    image_id: number | null;
  } | null>(null);

  const navigate = useNavigate();

  const update_word_puzzle_mut = useMutation(
    // SAFETY: the callbacks below only run after the mutation settles (async),
    // never during render — the ref is read/written from mutation lifecycle code.
    // oxlint-disable-next-line react/refs
    trpc.puzzle.update_puzzle.mutationOptions({
      onSuccess: async (data) => {
        if (data.success) {
          toast.success('Puzzle updated successfully');

          const submitted = saveSnapRef.current;
          const baseAttachments = submitted?.attachments ?? attachments;
          const savedImageId = submitted?.image_id ?? image_id;

          const { newly_added_index_ids } = data;
          const updatedAttachments =
            newly_added_index_ids.length > 0
              ? baseAttachments.map((val, i) => {
                  const elm = newly_added_index_ids.find(({ index }) => index === i);
                  return elm ? { ...val, id: elm.id } : val;
                })
              : baseAttachments;

          if (newly_added_index_ids.length > 0) {
            // after update for the newly added attachemnts filling
            // in the null values for thier ids
            setAttachments(updatedAttachments);
          }

          setImageBaseline(savedImageId);
          markSaved(
            newly_added_index_ids.length > 0 ? { attachments: updatedAttachments } : undefined
          );
          saveSnapRef.current = null;

          void queryClient.invalidateQueries({ queryKey: ['listed_puzzles_carousel'] });
          await router.invalidate();
        }
      },
      onError() {
        saveSnapRef.current = null;
        toast.error('Failed to update puzzle, check the entered data');
      }
    })
  );

  const delete_word_puzzle_mut = useMutation(
    trpc.puzzle.delete_puzzle.mutationOptions({
      onSuccess: async () => {
        toast.success('Puzzle deleted successfully');

        void queryClient.invalidateQueries({ queryKey: ['listed_puzzles_carousel'] });
        await router.invalidate();

        navigate({ href: '/padavali/list' });
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

    const data = {
      puzzle_id: word_puzzle.id,
      puzzle_slug: word_puzzle.slug,
      image_id: image_id,
      puzzle_data: {
        title,
        listed: listed,
        word_list: wordList,
        grid_data: gridData,
        description: description.trim(),
        attachments
      }
    } satisfies z.infer<typeof puzzle_update_input_schema>;
    const parse = puzzle_update_input_schema.safeParse(data);
    if (parse.success) {
      beginSave();
      saveSnapRef.current = { attachments, image_id };
      update_word_puzzle_mut.mutate(parse.data);
    } else {
      console.log(parse.error);
      toast.error('Failed to update puzzle, fix the entered data');
    }
  };

  const handleDelete = () => {
    delete_word_puzzle_mut.mutate({
      id: word_puzzle.id,
      slug: word_puzzle.slug
    });
  };

  return (
    <>
      <EditorActionDock onSave={handleSave} isSaving={update_word_puzzle_mut.isPending} />

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
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-400">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

const PuzzleImageSection = ({ word_puzzle }: { word_puzzle: Puzzle }) => {
  const [image_id, setImageId] = useAtom(image_id_atom);
  const [, setImageBaseline] = useAtom(image_baseline_atom);
  const [image_info, setImageInfo] = useAtom(image_info_atom);
  const [title] = useAtom(title_atom);
  const [description] = useAtom(description_atom);
  const [wordList] = useAtom(word_list_atom);

  return (
    <PuzzleCardImageSection
      puzzleId={word_puzzle.id}
      game="padavali"
      title={title}
      description={description}
      words={padavaliActiveWords(wordList).filter((word) => word.trim().length > 0)}
      imageId={image_id}
      imageInfo={image_info}
      onImageIdChange={setImageId}
      onImageInfoChange={setImageInfo}
      onImageBaselineChange={setImageBaseline}
    />
  );
};

export default ViewEditPuzzle;
