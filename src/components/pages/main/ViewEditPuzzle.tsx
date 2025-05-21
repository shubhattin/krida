'use client';

import { z } from 'zod';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
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
import { trpc_q } from '~/api/client';
import { toast } from 'sonner';
import { IoMdAdd, IoMdClose } from 'react-icons/io';
import { atom, useAtom, type WritableAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { FaRegUser } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

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

let BASE_SCRIPT = 'Sanskrit';

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
        <span className="text-xl font-bold">Title</span>
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
      <Label className="mb-2 block font-medium">Word List</Label>
      <div className="grid grid-cols-3 gap-2 space-y-2 sm:grid-cols-5 lg:grid-cols-6">
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
            <IoMdAdd className="text-lg" /> Add Word
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

const GridData = () => {
  const [gridData, setGridData] = useAtom(grid_data_atom);
  const cols = gridData.length > 0 ? gridData[0].length : 0;

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

  return (
    <div>
      <Label className="mb-2 block font-medium">Grid Data</Label>
      <div
        className="grid w-4/5 gap-1 sm:w-3/5 lg:w-2/5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {gridData.map((row, r) =>
          row.map((cell, c) => (
            <Input
              key={`${r}-${c}`}
              type="text"
              minLength={1}
              className="rounded text-center"
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

  const update_word_puzzle_mut = trpc_q.puzzle.update_puzzle.useMutation({
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

  const add_word_puzzle_mut = trpc_q.puzzle.add_puzzle.useMutation({
    onSuccess(data) {
      toast.success('Puzzle added successfully');
      router.push(`/edit/${data.id}`);
    },
    onError() {
      toast.error('Failed to add puzzle, check the entered data');
    }
  });

  const delete_word_puzzle_mut = trpc_q.puzzle.delete_puzzle.useMutation({
    onSuccess() {
      toast.success('Puzzle deleted successfully');
      router.push('/list');
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
                <IoMdAdd className="text-lg" /> Add
              </>
            ) : (
              <>
                <FaRegUser className="text-lg" /> Save
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              {is_addition
                ? 'Are you sure you want to add this new puzzle?'
                : 'Are you sure you want to update this puzzle?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!is_addition && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="flex text-lg" variant="destructive">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this puzzle? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ViewEditPuzzle;

function AtomsHydrator({
  atomValues,
  children
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atomValues: Iterable<readonly [WritableAtom<unknown, [any], unknown>, unknown]>;
  children: ReactNode;
}) {
  useHydrateAtoms(new Map(atomValues));
  return children;
}
