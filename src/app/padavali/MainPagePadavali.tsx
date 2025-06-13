'use client';

import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import WordGameRoot, { type WordGameProps } from '~/components/pages/main/WordGame/WordGameRoot';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { type ScriptType } from '~/state/script_font_data';
import { type Puzzle } from '~/components/pages/main/ViewEditPuzzle';
import { BsThreeDots } from 'react-icons/bs';
import { ArchiveIcon, ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

type Props = {
  script: ScriptType;
  word_puzzle: Puzzle;
  initial_script_data: WordGameProps['initial_script_data'];
};

const MainPagePadavali = ({ script, word_puzzle, initial_script_data }: Props) => {
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

  return (
    <>
      {/* Current Game Banner */}
      <div className="w-full border-b border-slate-200/60 bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 dark:border-slate-700/60 dark:from-emerald-950/30 dark:via-blue-950/30 dark:to-purple-950/30">
        <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 p-2 shadow-lg">
                  <IoExtensionPuzzleSharp className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-base font-bold text-transparent sm:text-lg dark:from-slate-100 dark:to-blue-400">
                    Current Week's Puzzle
                  </h2>
                  {/* <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(current_schedule.start_time)} -{' '}
                  {formatDate(current_schedule.end_time)}
                  </p> */}
                </div>
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
                  <div className="p-0 sm:p-0">
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

            {/* <div className="hidden items-center gap-3 text-sm text-slate-600 sm:flex dark:text-slate-400">
              <div className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                <span>Ends {formatTime(current_schedule.end_time)}</span>
              </div>
              <div className="flex h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="font-medium text-green-600 dark:text-green-400">Live</span>
            </div> */}
          </div>
        </div>
      </div>
      <WordGameRoot
        location="main_page"
        script={script}
        id={word_puzzle.id!}
        title={word_puzzle.title}
        grid_data={word_puzzle.grid_data}
        dims={word_puzzle.grid_dimensions}
        word_list={word_puzzle.word_list}
        initial_script_data={initial_script_data}
      ></WordGameRoot>
    </>
  );
};

export default MainPagePadavali;
