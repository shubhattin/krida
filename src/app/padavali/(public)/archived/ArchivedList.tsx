'use client';

import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { transliterate } from 'lipilekhika';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from '~/state/script_list';
import { motion } from 'framer-motion';
import { Button } from '~/components/ui/button';
import { ArrowLeftIcon, ArchiveIcon, Sparkles } from 'lucide-react';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import Link from 'next/link';
import { ScriptSelector } from '~/components/pages/main/ScriptSelector';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { AppContext } from '~/components/AppDataContext';
import { cn } from '~/lib/utils';
import { FONT_INFO } from '~/state/script_font_data';

type Props = {
  archived_puzzles: { id: number; uuid: string; title: string; description: string | null }[];
  script: ScriptType;
  archived_puzzles_init_transliterlated: {
    id: number;
    uuid: string;
    title: string;
    description: string | null;
  }[];
};

// Main component that handles the state and conditional rendering
export const ArchivedList = ({
  archived_puzzles: archived_puzzles_org,
  archived_puzzles_init_transliterlated
}: Props) => {
  const { script } = useContext(AppContext);

  const archived_puuzle_list_q = useQuery({
    queryKey: ['archived_puuzle_list', script],
    queryFn: async () => {
      const puzzle_texts = archived_puzzles_org.flatMap((p) =>
        p.description ? [p.title, p.description] : [p.title]
      );
      const transliterated_texts = await transliterate(puzzle_texts, DEFAULT_DATA_SCRIPT, script);
      let text_i = 0;
      return archived_puzzles_org.map((puzzle) => ({
        ...puzzle,
        title: transliterated_texts[text_i++]!,
        description: puzzle.description ? transliterated_texts[text_i++]! : null
      }));
    },
    placeholderData: archived_puzzles_init_transliterlated,
    enabled: true
  });
  const archived_puzzles = archived_puuzle_list_q.data!;

  return <PuzzleListView puzzles={archived_puzzles} />;
};

// Component that shows the list of archived puzzles
const PuzzleListView = ({ puzzles }: { puzzles: Props['archived_puzzles'] }) => {
  if (puzzles.length === 0) {
    return <EmptyPuzzleList />;
  }

  const { script, setScript } = useContext(AppContext);
  const font_info = FONT_INFO[script!];

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Back to Home button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Button
            render={<Link href="/padavali" className="gap-2" />}
            nativeButton={false}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Home
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-center sm:mb-6 lg:mb-8"
        >
          <div className="mb-4 flex justify-center">
            <div className="rounded-xl bg-linear-to-r from-amber-500 to-orange-500 p-3 shadow-lg">
              <ArchiveIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mb-2 bg-linear-to-r from-slate-800 to-blue-600 bg-clip-text text-3xl font-bold text-transparent dark:from-slate-100 dark:to-blue-400">
            Archived Puzzles
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Play Previous Puzzles</p>
          <div className="mt-2 flex items-center justify-center gap-2 sm:mt-3">
            <Icon className="size-7" src={LanguageIcon} />
            <ScriptSelector script={script} onScriptChange={setScript} />
            {font_info.experimental && (
              <span className="inline-flex items-center rounded-full bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                Beta
              </span>
            )}
          </div>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {puzzles.map((puzzle, index) => (
            <motion.div
              key={puzzle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <PuzzleCard puzzle={puzzle} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Individual puzzle card component
const PuzzleCard = ({ puzzle }: { puzzle: Props['archived_puzzles'][0] }) => {
  const { script } = useContext(AppContext);
  const font_info = FONT_INFO[script!];

  return (
    <Link href={`/padavali/archived/${puzzle.id}:${puzzle.uuid}`}>
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="group w-full rounded-xl border border-slate-200 bg-white p-2 pt-4 pl-3 shadow-lg transition-all duration-200 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-start">
          <div className="rounded-lg bg-linear-to-r from-blue-500 to-indigo-600 p-2 shadow-md group-hover:from-blue-600 group-hover:to-blue-700">
            <IoExtensionPuzzleSharp className="size-5.5 text-white" />
          </div>
          <div className="ml-3 flex-1 space-y-0.5 text-left">
            <div
              className={cn(
                'h-full font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400',
                font_info.className
              )}
            >
              {puzzle.title}
            </div>
            {puzzle.description && (
              <div
                className={cn(
                  'text-xs text-slate-600 dark:text-slate-400',
                  'line-clamp-1',
                  font_info.className
                )}
              >
                {puzzle.description}
              </div>
            )}
          </div>
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <Sparkles className="size-4 text-blue-500" />
          </div>
        </div>
      </motion.button>
    </Link>
  );
};

// Empty state component
const EmptyPuzzleList = () => {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex min-h-screen px-4 pt-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-md text-center"
        >
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-linear-to-r from-amber-400 to-orange-400 opacity-20 blur-xl"></div>
              <div className="relative rounded-full bg-linear-to-r from-amber-500 to-orange-500 p-6 shadow-2xl">
                <ArchiveIcon className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>

          <h1 className="mb-4 bg-linear-to-r from-slate-700 to-amber-600 bg-clip-text text-3xl font-bold text-transparent dark:from-slate-200 dark:to-amber-400">
            No Archived Puzzles
          </h1>

          <p className="mb-6 text-lg text-slate-600 dark:text-slate-300">
            There are no archived puzzles available yet. Check back later!
          </p>

          <div className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-100 to-purple-100 px-6 py-3 text-blue-700 shadow-lg dark:from-blue-900/30 dark:to-purple-900/30 dark:text-blue-300">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">New puzzles will appear here</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
