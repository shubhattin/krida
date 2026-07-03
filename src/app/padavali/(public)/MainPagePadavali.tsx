'use client';

import WordGameRoot, { type WordGameProps } from '~/components/pages/main/WordGame/WordGameRoot';
import { type ScriptType } from '~/state/script_list';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { puzzle_schema } from '~/db/db_shared_vals';
import { z } from 'zod';

type Props = {
  script: ScriptType;
  word_puzzle: z.infer<typeof puzzle_schema>;
  initial_script_data: WordGameProps['initial_script_data'];
  next_schedule:
    | {
        id: number;
        start_time: Date;
        puzzle: {
          id: number;
        };
      }
    | undefined;
};

const MainPagePadavali = ({ script, word_puzzle, initial_script_data, next_schedule }: Props) => {
  const [completed, setCompleted] = useState(false);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      {!completed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full border-b border-slate-200/60 bg-linear-to-r from-emerald-50 via-blue-50 to-purple-50 dark:border-slate-700/60 dark:from-emerald-950/30 dark:via-blue-950/30 dark:to-purple-950/30"
        >
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    animate={{
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  >
                    <Sparkles className="-mt-1 size-5 sm:size-5.5" />
                  </motion.div>
                  <motion.h2
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="bg-linear-to-r from-slate-800 to-blue-600 bg-clip-text text-base font-bold text-transparent sm:text-lg dark:from-slate-100 dark:to-blue-400"
                  >
                    Current Puzzle
                  </motion.h2>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      <WordGameRoot
        listed={word_puzzle.listed}
        location="main_page"
        script={script}
        id={word_puzzle.id!}
        puzzle_slug={word_puzzle.slug}
        title={word_puzzle.title}
        description={word_puzzle.description}
        grid_data={word_puzzle.grid_data}
        dims={word_puzzle.grid_dimensions}
        word_list={word_puzzle.word_list}
        initial_script_data={initial_script_data}
        onChangeCompleted={setCompleted}
        next_schedule={next_schedule}
        attachments={word_puzzle.attachments}
      />
    </div>
  );
};

export default MainPagePadavali;
