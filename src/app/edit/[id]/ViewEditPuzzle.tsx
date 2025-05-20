'use client';

import { set, z } from 'zod';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
// import { load_parivartak_lang_data } from '~/tools/lipi_lekhika/lekhika_core';
import { lekhika_typing_tool, load_parivartak_lang_data } from '~/tools/lipi_lekhika';

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

const ViewEditPuzzle = ({ word_puzzle }: { word_puzzle: z.infer<typeof puzzle_schema> }) => {
  const loaded = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      load_parivartak_lang_data(BASE_SCRIPT).then(() => {
        loaded.current = true;
      });
    }
  }, []);

  const handleSave = async () => {
    console.log('Saving...');
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
  const updateWord = (index: number, value: string) =>
    setWordList((prev) => prev.map((w, i) => (i === index ? value : w)));

  const updateCell = (r: number, c: number, value: string) => {
    setGridData((prev) => {
      const newGrid = prev.map((row) => [...row]);
      newGrid[r][c] = value;
      return newGrid;
    });
  };

  return (
    <Card className="space-y-6">
      <CardHeader>
        <CardTitle>Editing Puzzle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium">Title</Label>
            <Input
              type="text"
              className="mt-1 block w-full"
              value={title}
              onInput={(e) => {
                // if (!loaded.current) {
                setTitle(e.currentTarget.value);
                return;
                // }
                // console.log(e);
                // lekhika_typing_tool(
                //   e.nativeEvent.target,
                //   (e.nativeEvent.data as InputEvent).data,
                //   BASE_SCRIPT,
                //   true,
                //   (val) => {
                //     setTitle(val);
                //   }
                // );
              }}
            />
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Word List</Label>
            <div className="space-y-2">
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
                        className="w-full"
                        value={word}
                        onChange={(e) => updateWord(idx, e.target.value)}
                      />
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="destructive" size="icon" onClick={() => removeWord(idx)}>
                        -
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
                  + Add Word
                </Button>
              </motion.div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">Grid Data</Label>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {gridData.map((row, r) =>
                row.map((cell, c) => (
                  <Input
                    key={`${r}-${c}`}
                    type="text"
                    minLength={1}
                    className="w-full rounded"
                    value={cell}
                    onChange={(e) => updateCell(r, c, e.target.value)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <div className="flex justify-center p-4">
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
