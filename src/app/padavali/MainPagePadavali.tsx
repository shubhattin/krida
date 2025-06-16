'use client';

import WordGameRoot, {
  NextPuzzleTimePopup,
  type WordGameProps
} from '~/components/pages/main/WordGame/WordGameRoot';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { type ScriptType } from '~/state/script_font_data';
import { type Puzzle } from '~/components/pages/main/ViewEditPuzzle';
import { BsThreeDots } from 'react-icons/bs';
import { ArchiveIcon, ArrowRightIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { cn } from '~/lib/utils';

type Props = {
  script: ScriptType;
  word_puzzle: Puzzle;
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
  // Format dates for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const [completed, setCompleted] = useState(false);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      {/* Current Game Banner */}
      {!completed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full border-b border-slate-200/60 bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 dark:border-slate-700/60 dark:from-emerald-950/30 dark:via-blue-950/30 dark:to-purple-950/30"
        >
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-4">
                {/* <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 p-2 shadow-lg">
                  <IoExtensionPuzzleSharp className="size-5 text-white" />
                </div> */}
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
                    className="bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-base font-bold text-transparent sm:text-lg dark:from-slate-100 dark:to-blue-400"
                  >
                    Current Week's Puzzle
                  </motion.h2>
                </motion.div>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost">
                    <BsThreeDots className="size-3.5 sm:size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-72 overflow-hidden border-slate-200 bg-white p-0 shadow-xl sm:w-80 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className={cn('p-0 sm:p-0', next_schedule && 'p-1.5 pt-0 sm:p-2.5 sm:pt-0')}>
                    {next_schedule && (
                      <div className="flex items-center justify-center p-2">
                        <div className="flex items-center justify-center space-x-2 text-sm font-semibold text-amber-900 sm:text-base dark:text-amber-100">
                          Next puzzle in
                          <span className="ml-1 bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text font-bold text-transparent dark:from-emerald-400 dark:to-green-300">
                            {dayjs(next_schedule.start_time)
                              .fromNow(true)
                              .replace(
                                /\b(day|days|week|weeks|month|months|year|years)\b/gi,
                                (word) => word.charAt(0).toUpperCase() + word.slice(1)
                              )}
                          </span>
                          <NextPuzzleTimePopup
                            next_puzzle_start_time={next_schedule.start_time}
                            className="text-blue-500 dark:text-sky-200"
                          />
                        </div>
                      </div>
                    )}
                    <Link
                      href="/padavali/archived"
                      className="group flex items-center gap-2 rounded-xl border border-amber-200/50 bg-gradient-to-r from-amber-50 to-orange-50 p-3 text-amber-800 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:from-amber-100 hover:to-orange-100 hover:shadow-md sm:gap-3 sm:p-4 dark:border-amber-800/30 dark:from-amber-950/50 dark:to-orange-950/50 dark:text-amber-200 dark:hover:from-amber-900/60 dark:hover:to-orange-900/60"
                    >
                      <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 p-1.5 shadow-sm sm:p-2">
                        <ArchiveIcon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-amber-900 sm:text-base dark:text-amber-100">
                          View Archived Puzzles
                        </div>
                        <div className="text-xs text-amber-700 sm:text-sm dark:text-amber-300">
                          Browse and play past puzzles
                        </div>
                      </div>
                      <ArrowRightIcon className="h-3 w-3 text-amber-600 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4 dark:text-amber-400" />
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </motion.div>
      )}
      <WordGameRoot
        location="main_page"
        script={script}
        id={word_puzzle.id!}
        uuid={word_puzzle.uuid!}
        title={word_puzzle.title}
        description={word_puzzle.description}
        grid_data={word_puzzle.grid_data}
        dims={word_puzzle.grid_dimensions}
        word_list={word_puzzle.word_list}
        initial_script_data={initial_script_data}
        onChangeCompleted={setCompleted}
        next_schedule={next_schedule}
        discussion_url={word_puzzle.discussion_url}
      ></WordGameRoot>
    </div>
  );
};

export default MainPagePadavali;
