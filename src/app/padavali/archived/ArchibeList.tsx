'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { client_q } from '~/api/client';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from '~/state/script_font_data';
import { motion } from 'framer-motion';
import { Button } from '~/components/ui/button';
import { ArrowLeftIcon, PuzzleIcon, CalendarIcon, ArchiveIcon, Sparkles } from 'lucide-react';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import WordGameRoot from '~/components/pages/main/WordGame/WordGameRoot';
import Link from 'next/link';

type Props = {
  archived_puzzles: { id: number; uuid: string; title: string }[];
  script: ScriptType;
};

// Main component that handles the state and conditional rendering
export const ArchivedList = ({ archived_puzzles, script }: Props) => {
  const [selectedPuzzle, setSelectedPuzzle] = useState<{ id: number; uuid: string } | null>(null);

  const word_puzzle_q = client_q.padavali.get_puzzle_data.useQuery(
    {
      id: selectedPuzzle?.id ?? 0,
      uuid: selectedPuzzle?.uuid ?? ''
    },
    {
      enabled: !!selectedPuzzle
    }
  );

  const initial_script_data_q = useQuery({
    queryKey: ['initial_script_data', selectedPuzzle?.id, script],
    queryFn: async () => {
      const word_puzzle = word_puzzle_q.data!;
      const word_game_msgs = await get_transliterated_word_game_msgs(script);
      const title = await lipi_parivartak(word_puzzle.title, DEFAULT_DATA_SCRIPT, script);
      const grid_data = await Promise.all(
        word_puzzle.grid_data.map(
          async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script)
        )
      );
      return {
        word_msgs: word_game_msgs,
        title,
        grid_data
      };
    },
    enabled: !!selectedPuzzle && word_puzzle_q.isSuccess
  });

  // Show loading skeleton while puzzle data is loading
  if (selectedPuzzle && (word_puzzle_q.isLoading || initial_script_data_q.isLoading)) {
    return <PuzzleLoadingSkeleton onBack={() => setSelectedPuzzle(null)} />;
  }

  // Show the game when everything is loaded
  if (selectedPuzzle && word_puzzle_q.data && initial_script_data_q.data) {
    return (
      <PuzzleGameView
        puzzle={word_puzzle_q.data}
        initialScriptData={initial_script_data_q.data}
        script={script}
        onBack={() => setSelectedPuzzle(null)}
      />
    );
  }

  // Show the list view
  return (
    <PuzzleListView
      puzzles={archived_puzzles}
      onSelectPuzzle={(puzzle) => setSelectedPuzzle({ id: puzzle.id, uuid: puzzle.uuid })}
    />
  );
};

// Component that shows the list of archived puzzles
const PuzzleListView = ({
  puzzles,
  onSelectPuzzle
}: {
  puzzles: Props['archived_puzzles'];
  onSelectPuzzle: (puzzle: Props['archived_puzzles'][0]) => void;
}) => {
  if (puzzles.length === 0) {
    return <EmptyPuzzleList />;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Back to Home button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/padavali">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-3 shadow-lg">
              <ArchiveIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mb-2 bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-3xl font-bold text-transparent dark:from-slate-100 dark:to-blue-400">
            Archived Puzzles
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Play Previous Puzzles</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {puzzles.map((puzzle, index) => (
            <motion.div
              key={puzzle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <PuzzleCard puzzle={puzzle} onSelect={() => onSelectPuzzle(puzzle)} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Individual puzzle card component
const PuzzleCard = ({
  puzzle,
  onSelect
}: {
  puzzle: Props['archived_puzzles'][0];
  onSelect: () => void;
}) => {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group w-full rounded-xl border border-slate-200 bg-white p-5 shadow-lg transition-all duration-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 p-2 shadow-md group-hover:from-blue-600 group-hover:to-purple-600">
          <IoExtensionPuzzleSharp className="h-5 w-5 text-white" />
        </div>
        <div className="mt-2 flex-1 text-left">
          <span className="mb-2 h-full font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            {puzzle.title}
          </span>
        </div>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <Sparkles className="h-4 w-4 text-blue-500" />
        </div>
      </div>
    </motion.button>
  );
};

// Loading skeleton component
const PuzzleLoadingSkeleton = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <Button onClick={onBack} variant="ghost" className="gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
        </motion.div>

        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"></div>
            <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700"></div>
          </div>

          {/* Game layout skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left sidebar skeleton */}
            <div className="lg:col-span-3">
              <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
            </div>

            {/* Game grid skeleton */}
            <div className="lg:col-span-6">
              <div className="mx-auto h-96 w-full max-w-lg animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700"></div>
            </div>

            {/* Right sidebar skeleton */}
            <div className="lg:col-span-3">
              <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Empty state component
const EmptyPuzzleList = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex min-h-screen px-4 pt-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md text-center"
        >
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-amber-400 to-orange-400 opacity-20 blur-xl"></div>
              <div className="relative rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-6 shadow-2xl">
                <ArchiveIcon className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>

          <h1 className="mb-4 bg-gradient-to-r from-slate-700 to-amber-600 bg-clip-text text-3xl font-bold text-transparent dark:from-slate-200 dark:to-amber-400">
            No Archived Puzzles
          </h1>

          <p className="mb-6 text-lg text-slate-600 dark:text-slate-300">
            There are no archived puzzles available yet. Check back later!
          </p>

          <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-3 text-blue-700 shadow-lg dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-300">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">New puzzles will appear here</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Component that renders the actual game
const PuzzleGameView = ({
  puzzle,
  initialScriptData,
  script,
  onBack
}: {
  puzzle: any;
  initialScriptData: any;
  script: ScriptType;
  onBack: () => void;
}) => {
  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6">
        <Button
          onClick={onBack}
          variant="ghost"
          className="gap-2 bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
      </div>

      <WordGameRoot
        location="archive_page"
        script={script}
        id={puzzle.id}
        title={puzzle.title}
        description={puzzle.description}
        grid_data={puzzle.grid_data}
        dims={puzzle.grid_dimensions}
        word_list={puzzle.word_list}
        initial_script_data={initialScriptData}
      />
    </div>
  );
};
