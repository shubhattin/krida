'use client';

import { z } from 'zod';
import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { lekhika_typing_tool, load_parivartak_lang_data } from '~/tools/lipi_lekhika';
import { client_q } from '~/api/client';
import { toast } from 'sonner';
import { IoMdAdd, IoMdClose } from 'react-icons/io';
import { atom, useAtom } from 'jotai';
import { FiSave } from 'react-icons/fi';
import { MdDeleteOutline } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AtomsHydrator } from '~/components/AtomsHydrator';
import { findAllTraversals, getOccupiedCells, type Coordinate } from '~/tools/puzzle/puzzle_tools';
import { cn } from '~/lib/utils';

const puzzle_schema = z.object({
  id: z.number().int().nullable(),
  uuid: z.string().uuid().nullable(),
  title: z.string(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  word_list: z.string().min(2).array(),
  grid_data: z.string().min(1).array().array(),
  grid_dimensions: z.tuple([z.number().int(), z.number().int()])
});
export type Puzzle = z.infer<typeof puzzle_schema>;

const BASE_SCRIPT = 'Sanskrit';

const title_atom = atom<string>('');
const word_list_atom = atom<string[]>([]);
const grid_data_atom = atom<string[][]>([]);

const ViewEditPuzzle = ({ word_puzzle }: { word_puzzle: z.infer<typeof puzzle_schema> }) => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      load_parivartak_lang_data(BASE_SCRIPT);
    }
  }, []);

  return (
    <AtomsHydrator
      atomValues={[
        [title_atom, word_puzzle.title],
        [word_list_atom, [...word_puzzle.word_list]],
        [grid_data_atom, word_puzzle.grid_data.map((row) => [...row])]
      ]}
    >
      <Card className="space-y-1.5">
        <CardContent>
          <div className="space-y-4">
            <Title />
            <WordList />
            <TraversalAnalysis />
            <GridData />
            <SaveButton word_puzzle={word_puzzle} />
          </div>
        </CardContent>
      </Card>
    </AtomsHydrator>
  );
};

const Title = () => {
  const [title, setTitle] = useAtom(title_atom);

  return (
    <div>
      <Label className="block font-medium">
        <span className="text-xl font-bold">शीर्षकम्</span>
        <Input
          type="text"
          className="lg:1/5 mt-1 block w-3/5 text-lg font-semibold sm:w-2/5"
          value={title}
          onInput={(e) => {
            setTitle(e.currentTarget.value);
            lekhika_typing_tool(
              e.nativeEvent.target,
              // @ts-ignore
              e.nativeEvent.data,
              BASE_SCRIPT,
              true,
              // @ts-ignore
              (val) => {
                setTitle(val);
              }
            );
          }}
        />
      </Label>
    </div>
  );
};

const TraversalAnalysis = () => {
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);

  const analysisResult = useMemo(() => {
    if (gridData.length === 0 || wordList.length === 0) {
      return { warnings: [], hasAllValidWords: false, occupiedCells: new Set<string>() };
    }

    // Filter out empty strings from wordList
    const validWords = wordList.filter((word) => word.trim() !== '');

    if (validWords.length === 0) {
      return { warnings: [], hasAllValidWords: false, occupiedCells: new Set<string>() };
    }

    const gridDimensions: [number, number] = [gridData.length, gridData[0]?.length || 0];
    const traversalsMap = findAllTraversals(gridData, gridDimensions, validWords);
    const occupiedCells = getOccupiedCells(traversalsMap);

    const warnings: {
      wordIndex: number;
      word: string;
      traversalCount: number;
      type: 'none' | 'multiple';
      paths?: Coordinate[][];
    }[] = [];
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

    // Convert coordinates to string set for easier lookup
    const occupiedCellsSet = new Set<string>();
    for (const [r, c] of occupiedCells) {
      occupiedCellsSet.add(`${r},${c}`);
    }

    return {
      warnings,
      hasAllValidWords: hasAllValidWords && warnings.length === 0,
      occupiedCells: occupiedCellsSet
    };
  }, [wordList, gridData]);

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
                        "<span className="font-semibold">{warning.word}</span>" इति शब्दः
                        स्थानपट्टिकायाम् न प्राप्यते ।
                      </>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>
                          "<span className="font-semibold">{warning.word}</span>" इत्यस्य एकाधिको (
                          {warning.traversalCount}) मार्गाः सन्ति ।
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="-mt-1 h-4 w-4 cursor-help text-amber-600 dark:text-amber-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {warning.paths?.map((path, pIdx) => (
                                <p key={pIdx} className="text-xs">
                                  <span className="font-semibold">Path {pIdx + 1}:</span>{' '}
                                  {path.map(([r, c]) => `(${r},${c})`).join(' → ')}
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
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
              className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500"
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

  const addWord = () => setWordList((prev) => [...prev, '']);
  const removeWord = (index: number) => setWordList((prev) => prev.filter((_, i) => i !== index));
  const updateWord = (index: number, value: string, e: any) => {
    setWordList((prev) => prev.map((w, i) => (i === index ? value : w)));
    lekhika_typing_tool(
      e.nativeEvent.target,
      // @ts-ignore
      e.nativeEvent.data,
      BASE_SCRIPT,
      true,
      // @ts-ignore
      (val) => {
        setWordList((prev) => prev.map((w, i) => (i === index ? val : w)));
      }
    );
  };

  return (
    <div>
      <Label className="mb-2 block font-medium">शब्दानां सूची</Label>
      <div className="grid max-w-7xl grid-cols-2 gap-2 space-y-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        <AnimatePresence mode="popLayout">
          {wordList.map((word, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, height: 0, x: -20 }}
              animate={{ opacity: 1, height: 'auto', x: 0 }}
              exit={{ opacity: 0, height: 0, x: 20 }}
              transition={{
                duration: 0.2,
                exit: { duration: 0.15 }
              }}
              className="flex items-center space-x-2 overflow-hidden"
            >
              <motion.div className="flex-1">
                <Input
                  type="text"
                  className="px- py-1 text-base"
                  value={word}
                  onChange={(e) => updateWord(idx, e.target.value, e)}
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

const GridData = () => {
  const [gridData, setGridData] = useAtom(grid_data_atom);
  const [wordList] = useAtom(word_list_atom);
  const cols = gridData.length > 0 ? gridData[0].length : 0;

  const occupiedCells = useMemo(() => {
    if (gridData.length === 0 || wordList.length === 0) {
      return new Set<string>();
    }

    // Filter out empty strings from wordList
    const validWords = wordList.filter((word) => word.trim() !== '');

    if (validWords.length === 0) {
      return new Set<string>();
    }

    const gridDimensions: [number, number] = [gridData.length, gridData[0]?.length || 0];
    const traversalsMap = findAllTraversals(gridData, gridDimensions, validWords);
    const occupiedCellsCoords = getOccupiedCells(traversalsMap);

    const occupiedCellsSet = new Set<string>();
    for (const [r, c] of occupiedCellsCoords) {
      occupiedCellsSet.add(`${r},${c}`);
    }
    return occupiedCellsSet;
  }, [gridData, wordList]);

  const updateCell = (r: number, c: number, value: string, e: any) => {
    setGridData((prev) => {
      const newGrid = prev.map((row) => [...row]);
      newGrid[r][c] = value;
      return newGrid;
    });
    lekhika_typing_tool(
      e.nativeEvent.target,
      // @ts-ignore
      e.nativeEvent.data,
      BASE_SCRIPT,
      true,
      // @ts-ignore
      (val) => {
        setGridData((prev) => {
          const newGrid = prev.map((row) => [...row]);
          newGrid[r][c] = val;
          return newGrid;
        });
      }
    );
  };

  const getCellClassName = (r: number, c: number) => {
    const isOccupied = occupiedCells.has(`${r},${c}`);
    return `rounded text-center transition-all duration-200 ${
      isOccupied
        ? 'ring-1 ring-blue-300 ring-opacity-50 shadow-sm dark:ring-blue-500 dark:ring-opacity-40'
        : ''
    }`;
  };

  return (
    <div>
      <Label className="mb-2 block font-medium">स्थानपट्टिका</Label>
      <div
        className="md:3/5 grid w-full gap-1 sm:w-4/5 md:w-3/5 lg:w-2/5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {gridData.map((row, r) =>
          row.map((cell, c) => (
            <Input
              key={`${r}-${c}`}
              type="text"
              minLength={1}
              className={getCellClassName(r, c)}
              value={cell}
              onChange={(e) => updateCell(r, c, e.target.value, e)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const SaveButton = ({ word_puzzle }: { word_puzzle: z.infer<typeof puzzle_schema> }) => {
  const [title] = useAtom(title_atom);
  const [wordList] = useAtom(word_list_atom);
  const [gridData] = useAtom(grid_data_atom);
  const initialRef = useRef({
    title: word_puzzle.title,
    wordList: word_puzzle.word_list,
    gridData: word_puzzle.grid_data
  });

  const router = useRouter();

  const update_word_puzzle_mut = client_q.padavali.update_puzzle.useMutation({
    onSuccess: (data) => {
      toast.success('Puzzle updated successfully');
      initialRef.current = {
        title,
        wordList,
        gridData
      };
    },
    onError() {
      toast.error('Failed to update puzzle, check the entered data');
    }
  });

  const add_word_puzzle_mut = client_q.padavali.add_puzzle.useMutation({
    onSuccess(data) {
      toast.success('Puzzle added successfully');
      router.push(`/padavali/edit/${data.id}`);
    },
    onError() {
      toast.error('Failed to add puzzle, check the entered data');
    }
  });

  const delete_word_puzzle_mut = client_q.padavali.delete_puzzle.useMutation({
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
      JSON.stringify(gridData) !== JSON.stringify(initialRef.current.gridData)
    );
  }, [title, wordList, gridData]);

  const is_addition = word_puzzle.id === null || word_puzzle.id === undefined;

  const handleSave = async () => {
    if (!is_addition) {
      await update_word_puzzle_mut.mutateAsync({
        id: word_puzzle.id!,
        uuid: word_puzzle.uuid!,
        title,
        created_at: word_puzzle.created_at,
        updated_at: new Date(),
        word_list: wordList,
        grid_data: gridData,
        grid_dimensions: word_puzzle.grid_dimensions
      });
    } else {
      await add_word_puzzle_mut.mutateAsync({
        title,
        word_list: wordList,
        grid_data: gridData,
        grid_dimensions: word_puzzle.grid_dimensions
      });
    }
  };

  const handleDelete = async () => {
    if (!is_addition) {
      await delete_word_puzzle_mut.mutateAsync({
        id: word_puzzle.id!
      });
    }
  };

  return (
    <div className="mx-2 mt-2 flex items-center justify-between sm:mx-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={!isEdited} className="flex text-lg" variant={'outline'}>
            {is_addition ? (
              <>
                <IoMdAdd className="text-lg" /> योज्यताम्
              </>
            ) : (
              <>
                <FiSave className="text-lg" /> रक्ष्यताम्
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
