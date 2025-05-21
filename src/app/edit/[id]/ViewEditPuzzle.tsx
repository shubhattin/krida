'use client';

import { z } from 'zod';
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { atom } from 'jotai';

const puzzle_schema = z.object({
  id: z.number().int(),
  uuid: z.string().uuid(),
  title: z.string(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  word_list: z.string().min(2).array(),
  grid_data: z.string().min(1).array().array(),
  grid_dimensions: z.tuple([z.number().int(), z.number().int()])
});

let BASE_SCRIPT = 'Sanskrit';

const sdf = atom<string[]>([]);

const ViewEditPuzzle = ({ word_puzzle }: { word_puzzle: z.infer<typeof puzzle_schema> }) => {
  const update_word_puzzle_mut = trpc_q.puzzle.update_puzzle.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Puzzle updated successfully');
        initialRef.current = {
          title,
          wordList,
          gridData
        };
      } else {
        toast.error('Failed to update puzzle');
      }
    }
  });

  const loaded = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      load_parivartak_lang_data(BASE_SCRIPT).then(() => {
        loaded.current = true;
      });
    }
  }, []);

  const handleSave = async () => {
    await update_word_puzzle_mut.mutateAsync({
      id: word_puzzle.id,
      uuid: word_puzzle.uuid,
      title,
      created_at: word_puzzle.created_at,
      updated_at: new Date(),
      word_list: wordList,
      grid_data: gridData,
      grid_dimensions: [rows, cols]
    });
  };
  const [title, setTitle] = useState<string>(word_puzzle.title);
  const [wordList, setWordList] = useState<string[]>([...word_puzzle.word_list]);
  const [gridData, setGridData] = useState<string[][]>(
    word_puzzle.grid_data.map((row) => [...row])
  );
  const [rows, cols] = word_puzzle.grid_dimensions;

  const initialRef = React.useRef({
    title: word_puzzle.title,
    wordList: word_puzzle.word_list,
    gridData: word_puzzle.grid_data
  });

  const isEdited = React.useMemo(() => {
    return (
      title !== initialRef.current.title ||
      JSON.stringify(wordList) !== JSON.stringify(initialRef.current.wordList) ||
      JSON.stringify(gridData) !== JSON.stringify(initialRef.current.gridData)
    );
  }, [title, wordList, gridData]);

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
    <Card className="space-y-1.5">
      <CardHeader className="mb-0">
        <CardTitle>Edit '{word_puzzle.title}' Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="block font-medium">
              Title
              <Input
                type="text"
                className="lg:1/5 mt-1 block w-3/5 sm:w-2/5"
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
          <div>
            <Label className="mb-2 block font-medium">Word List</Label>
            <div className="grid grid-cols-3 gap-2 space-y-2 sm:grid-cols-5 lg:grid-cols-6">
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

          <div>
            <Label className="mb-2 block font-medium">Grid Data</Label>
            <div
              className="grid w-full gap-1 sm:w-4/5 lg:w-3/5"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {gridData.map((row, r) =>
                row.map((cell, c) => (
                  <Input
                    key={`${r}-${c}`}
                    type="text"
                    minLength={1}
                    className="rounded"
                    value={cell}
                    onChange={(e) => updateCell(r, c, e.target.value, e)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <div className="mx-6 sm:mx-10">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!isEdited}>Save</Button>
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
      </div>
    </Card>
  );
};

export default ViewEditPuzzle;
