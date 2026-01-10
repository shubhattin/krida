'use client';

import { z } from 'zod';
import { useEffect, useMemo, useRef } from 'react';
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
import { client_q } from '~/api/client';
import { toast } from 'sonner';
import { IoMdAdd, IoMdClose } from 'react-icons/io';
import { atom, useAtom } from 'jotai';
import { FiSave } from 'react-icons/fi';
import { MdDeleteOutline, MdDragIndicator } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { Info, ArrowRight } from 'lucide-react';
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
  puzzle_schema as _puzzle_schema,
  attachment_schema,
  ATTACHMENT_TYPE_LIST,
  ATTACHMENT_TYPE_NAMES,
  puzzle_add_input_schema,
  puzzle_update_input_schema
} from '~/db/db_shared_vals';
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

const puzzle_schema = _puzzle_schema
  .extend({
    id: z.number().int().nullable(),
    uuid: z.string().uuid().nullable()
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

export type Puzzle = z.infer<typeof puzzle_schema>;

const BASE_SCRIPT = 'Devanagari';

const title_atom = atom<string>('');
const word_list_atom = atom<string[]>([]);
const grid_data_atom = atom<string[][]>([]);
const archived_atom = atom<boolean>(false);
const description_atom = atom<string | null>(null);
const lipi_lekhika_active_atom = atom<boolean>(true);
const attachments_atom = atom<Puzzle['attachments']>([]);

export type ViewEditProps =
  | {
      word_puzzle: Puzzle;
      location: 'add_page';
    }
  | {
      word_puzzle: Puzzle & {
        id: number;
        uuid: string;
      };
      location: 'edit_page';
    };

const ViewEditPuzzle = ({ word_puzzle }: ViewEditProps) => {
  useHydrateAtoms([
    [title_atom, word_puzzle.title],
    [word_list_atom, [...word_puzzle.word_list]],
    [grid_data_atom, word_puzzle.grid_data.map((row) => [...row])],
    [archived_atom, word_puzzle.archived],
    [description_atom, word_puzzle.description],
    [lipi_lekhika_active_atom, true],
    [attachments_atom, word_puzzle.attachments]
  ]);

  return (
    <Card className="space-y-1.5">
      <CardContent>
        <div className="space-y-4">
          <LipiLekhikaSwitch />
          <Title />
          <ArchivedSwitch />
          <Description />
          <Attachments />
          <WordList />
          <TraversalAndGridData grid_dimensions={word_puzzle.grid_dimensions} />
          <SaveButton word_puzzle={word_puzzle} />
        </div>
      </CardContent>
    </Card>
  );
};

const Title = () => {
  const ctx = createTypingContext(BASE_SCRIPT);
  const [title, setTitle] = useAtom(title_atom);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);

  useEffect(() => {
    ctx.ready;
  }, [ctx]);

  return (
    <div>
      <Label className="block font-medium">
        <span className="text-xl font-bold">शीर्षकम्</span>
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
          onBlur={() => ctx.clearContext()}
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
  onUpdate: (field: string, value: any, event: any) => void;
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
          <Select value={attachment.type} onValueChange={(value) => onUpdate('type', value, null)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select attachment type" />
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
          />
        </div>
      </div>
      <div className="flex items-center justify-center space-x-2">
        <Label>
          Title <span className="text-xs text-gray-500 dark:text-gray-400">ऐच्छिक</span>
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
          onBlur={() => ctx.clearContext()}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
        />
      </div>
    </div>
  );
};

const Attachments = () => {
  const [attachments, setAttachments] = useAtom(attachments_atom);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);

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

  const updateAttachment = (index: number, field: string, value: any, e: any) => {
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
    <Accordion type="single" collapsible className="w-fit">
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
                    onUpdate={(field, value, event) => updateAttachment(index, field, value, event)}
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
        <span className="text-base font-bold">देवनागरी</span>
      </Label>
    </div>
  );
};

const getTraversalsInfo = (
  gridData: string[][],
  wordList: string[],
  gridDimensions: [number, number]
) => {
  const validWords = wordList.filter((word) => word.trim() !== '');
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

const TraversalAndGridData = ({ grid_dimensions }: { grid_dimensions: [number, number] }) => {
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);

  const { traversalsMap, validWords, occupiedCells } = getTraversalsInfo(
    gridData,
    wordList,
    grid_dimensions
  );

  return (
    <>
      <TraversalAnalysis
        grid_dimensions={grid_dimensions}
        traversalsMap={traversalsMap}
        validWords={validWords}
      />
      <GridData grid_dimensions={grid_dimensions} occupiedCells={occupiedCells} />
    </>
  );
};

const TraversalAnalysis = ({
  traversalsMap,
  validWords
}: {
  grid_dimensions: [number, number];
  traversalsMap: Map<number, Traversal[]>;
  validWords: string[];
}) => {
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);

  const analysisResult = (() => {
    if (gridData.length === 0 || wordList.length === 0 || validWords.length === 0) {
      return {
        warnings: [],
        cellConflicts: [],
        hasAllValidWords: false,
        occupiedCells: new Set<string>()
      };
    }

    const warnings: {
      wordIndex: number;
      word: string;
      traversalCount: number;
      type: 'none' | 'multiple' | 'duplicate';
      paths?: Coordinate[][];
      duplicateIndices?: number[];
    }[] = [];
    let hasAllValidWords = true;

    // Get cell conflicts
    const cellConflicts = getCellConflicts(traversalsMap, validWords);

    // Check for duplicate words in validWords
    const wordCountMap = new Map<string, number[]>();
    validWords.forEach((word, index) => {
      if (!wordCountMap.has(word)) {
        wordCountMap.set(word, []);
      }
      wordCountMap.get(word)!.push(index);
    });

    // Add warnings for duplicate words
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

    return {
      warnings,
      cellConflicts,
      hasAllValidWords: hasAllValidWords && warnings.length === 0 && cellConflicts.length === 0
    };
  })();

  if (gridData.length === 0 || wordList.length === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
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
                        "<span className="font-semibold">{warning.word}</span>" इति शब्दं
                        स्थानपट्टिकायां न प्राप्यते ।
                      </>
                    ) : warning.type === 'duplicate' ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>
                          "<span className="font-semibold">{warning.word}</span>" इति शब्दः
                          शब्दसूच्यां एकाधिकवारं ({warning.traversalCount}) पुनरावृत्तः ।
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Info className="-mt-1 size-4.5 text-amber-600 dark:text-amber-400" />
                          </PopoverTrigger>
                          <PopoverContent className="max-w-xs" align="center">
                            <div className="text-xs">
                              <span className="font-semibold">स्थानाङ्काः:</span>
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
                          "<span className="font-semibold">{warning.word}</span>" इत्यस्य एकाधिकाः (
                          {warning.traversalCount}) मार्गाः सन्ति ।
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Info className="-mt-1 size-4.5 text-amber-600 dark:text-amber-400" />
                          </PopoverTrigger>
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
                कोष्ठसंघर्षाः ({analysisResult.cellConflicts.length})
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
                        कोष्ठं{' '}
                        <span className="font-semibold">
                          ({conflict.cellPosition[0] + 1},{conflict.cellPosition[1] + 1})
                        </span>{' '}
                        एकाधिकैः शब्दैः उपयुज्यते
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
              सर्वे शब्दाः सम्यगवस्थिताः !
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const WordList = () => {
  const [wordList, setWordList] = useAtom(word_list_atom);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);

  const addWord = () => setWordList((prev) => [...prev, '']);
  const removeWord = (index: number) => setWordList((prev) => prev.filter((_, i) => i !== index));
  const updateWord = (index: number, value: string, e: any) => {
    setWordList((prev) => prev.map((w, i) => (i === index ? value : w)));
  };

  const ctx = createTypingContext(BASE_SCRIPT);

  return (
    <div>
      <Label className="mb-2 block text-lg font-semibold">शब्दानां सूची</Label>
      <div className="grid max-w-7xl grid-cols-2 gap-2 space-y-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        <AnimatePresence mode="popLayout">
          {wordList.map((word, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, height: 0, x: -20 }}
              animate={{ opacity: 1, height: 'auto', x: 0 }}
              exit={{ opacity: 0, height: 0, x: 20 }}
              transition={{
                duration: 0.2
              }}
              className="flex items-center space-x-2 overflow-hidden"
            >
              <motion.div className="flex-1">
                <Input
                  type="text"
                  className="px- py-1 text-base"
                  value={word}
                  onChange={(e) => updateWord(idx, e.currentTarget.value, e)}
                  onBeforeInput={(e) =>
                    handleTypingBeforeInputEvent(
                      ctx,
                      e,
                      (newValue) => updateWord(idx, newValue, e),
                      lipi_lekhika_active
                    )
                  }
                  onBlur={() => ctx.clearContext()}
                  onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
                />
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={'ghost'}
                  className="p-0 text-red-500 has-[>svg]:p-0 dark:text-red-400"
                  onClick={() => removeWord(idx)}
                >
                  <IoMdClose className="inline-block" />
                </Button>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-block"
        >
          <Button variant="outline" size="sm" onClick={addWord}>
            <IoMdAdd className="text-lg" /> शब्दस्थानं युञ्जतु
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

const GridData = ({
  grid_dimensions,
  occupiedCells
}: {
  grid_dimensions: [number, number];
  occupiedCells: Set<Coordinate>;
}) => {
  const [gridData, setGridData] = useAtom(grid_data_atom);
  const [wordList] = useAtom(word_list_atom);
  const cols = grid_dimensions[1];
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);

  const occupiedCellsStrList = (() => {
    if (gridData.length === 0 || wordList.length === 0) {
      return new Set<string>();
    }

    const occupiedCellsCoords = occupiedCells;

    const occupiedCellsSet = new Set<string>();
    for (const [r, c] of occupiedCellsCoords) {
      occupiedCellsSet.add(`${r},${c}`);
    }
    return occupiedCellsSet;
  })();

  const updateCell = (r: number, c: number, value: string, e: any) => {
    setGridData((prev) => {
      const newGrid = prev.map((row) => [...row]);
      newGrid[r][c] = value;
      return newGrid;
    });
  };

  const ctx = createTypingContext(BASE_SCRIPT);

  const getCellClassName = (r: number, c: number) => {
    const isOccupied = occupiedCellsStrList.has(`${r},${c}`);
    return `rounded text-center transition-all duration-200 ${
      isOccupied
        ? 'ring-1 ring-blue-300 ring-opacity-50 shadow-sm dark:ring-blue-500 dark:ring-opacity-40'
        : ''
    }`;
  };

  return (
    <div>
      <Label className="mb-2 block text-lg font-semibold">स्थानपट्टिका</Label>
      <div
        className="md:3/5 grid w-full gap-1 sm:w-4/5 md:w-3/5 lg:w-2/5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {gridData.map((row, r) =>
          row.map((cell, c) => (
            <Input
              key={`${r}-${c}`}
              type="text"
              className={getCellClassName(r, c)}
              minLength={1}
              value={cell}
              onChange={(e) => updateCell(r, c, e.currentTarget.value, e)}
              onBeforeInput={(e) =>
                handleTypingBeforeInputEvent(
                  ctx,
                  e,
                  (newValue) => updateCell(r, c, newValue, e),
                  lipi_lekhika_active
                )
              }
              onBlur={() => ctx.clearContext()}
              onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const ArchivedSwitch = () => {
  const [archived, setArchived] = useAtom(archived_atom);

  return (
    <div>
      <Label className="inline-flex items-center gap-2 font-medium">
        <Switch checked={archived} onCheckedChange={setArchived} />
        <span className="text-lg font-bold">संग्रहीतम्</span>
      </Label>
    </div>
  );
};

const Description = () => {
  const [description, setDescription] = useAtom(description_atom);
  const [lipi_lekhika_active] = useAtom(lipi_lekhika_active_atom);

  const ctx = createTypingContext(BASE_SCRIPT);

  return (
    <div>
      <Label className="block font-medium">
        <span className="text-lg font-bold">
          वर्णनम्
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">ऐच्छिक</span>
        </span>
        <Input
          className="mt-1 w-full sm:w-[90%] md:w-2/3 lg:w-1/2"
          value={description || ''}
          onChange={(e) => setDescription(e.currentTarget.value)}
          onBeforeInput={(e) =>
            handleTypingBeforeInputEvent(
              ctx,
              e,
              (newValue) => setDescription(newValue),
              lipi_lekhika_active
            )
          }
          onBlur={() => ctx.clearContext()}
          onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
          placeholder="प्रहेलिकायाः वर्णनं लिखतु..."
        />
      </Label>
    </div>
  );
};

const SaveButton = ({ word_puzzle }: { word_puzzle: z.infer<typeof puzzle_schema> }) => {
  const [title] = useAtom(title_atom);
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);
  const [attachments, setAttachments] = useAtom(attachments_atom);
  const initialRef = useRef({
    title: word_puzzle.title,
    wordList: word_puzzle.word_list,
    gridData: word_puzzle.grid_data,
    archived: word_puzzle.archived,
    description: word_puzzle.description,
    attachments: word_puzzle.attachments
  });
  const [archived] = useAtom(archived_atom);
  const [description] = useAtom(description_atom);

  const router = useRouter();

  const update_word_puzzle_mut = client_q.puzzle.update_puzzle.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Puzzle updated successfully');

        const { newly_added_index_ids } = data;
        if (newly_added_index_ids.length > 0) {
          // after update for the newly added attachemnts filling
          // in the null values for thier ids
          setAttachments((prev) => {
            return prev.map((val, i) => ({
              ...val,
              ...(() => {
                const elm = newly_added_index_ids.find(({ index }) => index === i);
                return elm ? { id: elm.id } : {};
              })()
            }));
          });
        }

        initialRef.current = {
          title,
          wordList,
          gridData,
          archived,
          description,
          attachments
        };
      }
    },
    onError() {
      toast.error('Failed to update puzzle, check the entered data');
    }
  });

  const add_word_puzzle_mut = client_q.puzzle.add_puzzle.useMutation({
    onSuccess(data) {
      toast.success('Puzzle added successfully');
      router.push(`/padavali/edit/${data.id}`);
    },
    onError() {
      toast.error('Failed to add puzzle, check the entered data');
    }
  });

  const delete_word_puzzle_mut = client_q.puzzle.delete_puzzle.useMutation({
    onSuccess() {
      toast.success('Puzzle deleted successfully');
      router.push('/padavali/list');
    },
    onError() {
      toast.error('Failed to delete puzzle');
    }
  });

  const isEdited = useMemo(() => {
    return (
      title !== initialRef.current.title ||
      JSON.stringify(wordList) !== JSON.stringify(initialRef.current.wordList) ||
      JSON.stringify(gridData) !== JSON.stringify(initialRef.current.gridData) ||
      archived !== initialRef.current.archived ||
      description !== initialRef.current.description ||
      JSON.stringify(attachments) !== JSON.stringify(initialRef.current.attachments)
    );
  }, [title, wordList, gridData, archived, description, attachments]);

  const is_addition = word_puzzle.id === null || word_puzzle.id === undefined;

  const handleSave = async () => {
    if (!is_addition) {
      const data = {
        puzzle_id: word_puzzle.id!,
        puzzle_uuid: word_puzzle.uuid!,
        puzzle_data: {
          title,
          archived,
          word_list: wordList,
          grid_data: gridData,
          description: description !== '' ? description : null,
          attachments
        }
      };
      const parse = puzzle_update_input_schema.safeParse(data);
      if (parse.success) {
        await update_word_puzzle_mut.mutateAsync(parse.data);
      } else {
        console.log(parse.error);
        toast.error('Failed to update puzzle, fix the entered data');
      }
    } else {
      const data = {
        title,
        word_list: wordList,
        grid_data: gridData,
        grid_dimensions: word_puzzle.grid_dimensions,
        archived,
        description: description !== '' ? description : null,
        attachments
      };
      const parse = puzzle_add_input_schema.safeParse(data);
      if (parse.success) {
        await add_word_puzzle_mut.mutateAsync(parse.data);
      } else {
        console.log(parse.error);
        toast.error('Failed to add puzzle, fix the entered data');
      }
    }
  };

  const handleDelete = async () => {
    if (!is_addition) {
      await delete_word_puzzle_mut.mutateAsync({
        id: word_puzzle.id!,
        uuid: word_puzzle.uuid!
      });
    }
  };

  return (
    <div className="mx-2 mt-2 flex items-center justify-between sm:mx-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            disabled={
              !isEdited || add_word_puzzle_mut.isPending || update_word_puzzle_mut.isPending
            }
            className="flex text-lg"
            variant={'outline'}
          >
            {is_addition ? (
              <>
                <IoMdAdd className="text-lg" />{' '}
                {!add_word_puzzle_mut.isPending ? 'योज्यताम्' : 'योज्यमानम्...'}
              </>
            ) : (
              <>
                <FiSave className="text-lg" />{' '}
                {!update_word_puzzle_mut.isPending ? 'रक्ष्यताम्' : 'रक्ष्यमानम्...'}
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>रक्षणाय अनुमोदनम</AlertDialogTitle>
            <AlertDialogDescription>
              {is_addition ? 'निश्चयेन योजामहे किम् ? ?' : 'निश्चयेन रक्षामः किम् ?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>मास्तु</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>अस्तु</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!is_addition && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="flex gap-1 px-1 py-0 text-sm" variant="destructive">
              <MdDeleteOutline className="text-base" />
              मार्ज्यताम्
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>निष्कासितुं दृढः</AlertDialogTitle>
              <AlertDialogDescription>
                किन्त्वन्निश्चितरूपेणेदं प्रहेलिकां निष्कासितुमिच्छसि ? एतत्कार्यमनिवर्तयितुं शक्यते
                !
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>मास्तु</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-400">
                अस्तु
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ViewEditPuzzle;
