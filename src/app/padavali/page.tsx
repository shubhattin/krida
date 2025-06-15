import { db } from '~/db/db';
import { Metadata } from 'next';
import { DEFAULT_DATA_SCRIPT } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs } from '~/components/pages/main/WordGame/msgs';
import { lipi_parivartak } from '~/tools/lipi_lekhika';
import { ClockIcon, CalendarIcon, ArchiveIcon, ArrowRightIcon } from 'lucide-react';
import { IoExtensionPuzzleSharp } from 'react-icons/io5';
import Link from 'next/link';
import MainPagePadavali from './MainPagePadavali';
import { getCachedScript } from '~/lib/cache_server_data';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const dynamic = 'force-dynamic';

export default async function Home() {
  const currentTime = new Date();
  const current_schedule_pr = db.query.puzzle_game_schedules.findFirst({
    columns: {
      id: true,
      start_time: true,
      end_time: true
    },
    where: (tbl, { eq, and, lte, gte }) =>
      and(
        lte(tbl.start_time, currentTime),
        gte(tbl.end_time, currentTime),
        eq(tbl.completed, false)
      ),
    with: {
      puzzle: true
    }
  });
  const next_schedule_pr = db.query.puzzle_game_schedules.findFirst({
    columns: {
      id: true,
      start_time: true
    },
    where: (tbl, { eq, and, gt }) => and(gt(tbl.start_time, currentTime), eq(tbl.completed, false)),
    orderBy: (tbl, { asc }) => asc(tbl.start_time),
    with: {
      puzzle: {
        columns: {
          id: true,
          title: true
        }
      }
    }
  });
  const [current_schedule, next_schedule] = await Promise.all([
    current_schedule_pr,
    next_schedule_pr
  ]);

  if (!current_schedule) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex min-h-screen justify-center px-4 pt-28">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 blur-xl"></div>
                <div className="relative rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-6 shadow-2xl">
                  <ClockIcon className="size-10 text-white sm:size-10.5 md:size-11" />
                </div>
              </div>
            </div>

            <h1 className="mb-4 bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-3xl font-bold text-transparent dark:from-slate-200 dark:to-blue-400">
              No Puzzle Scheduled
            </h1>

            <div className="mb-6 space-y-3">
              <p className="text-lg text-slate-600 dark:text-slate-300">
                There's no puzzle scheduled right now
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CalendarIcon className="h-4 w-4" />
                <span>Check back later for new puzzles</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-100 to-blue-100 px-6 py-3 text-emerald-700 shadow-lg dark:from-emerald-900/30 dark:to-blue-900/30 dark:text-emerald-300">
                <IoExtensionPuzzleSharp className="-mt-1 size-5" />
                {next_schedule ? (
                  <span className="font-semibold">
                    Next puzzle in{' '}
                    <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text font-bold text-transparent dark:from-emerald-400 dark:to-green-300">
                      {dayjs(next_schedule.start_time)
                        .fromNow(true)
                        .replace(
                          /\b(day|days|week|weeks|month|months|year|years)\b/gi,
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )}
                    </span>
                  </span>
                ) : (
                  <span className="font-medium">New puzzles coming soon!</span>
                )}
              </div>

              <div className="flex items-center justify-center">
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600"></div>
                <span className="mx-4 text-sm text-slate-400 dark:text-slate-500">or</span>
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600"></div>
              </div>

              <Link
                href="/padavali/archived"
                className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 text-amber-700 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl dark:from-amber-900/20 dark:to-orange-900/20 dark:text-amber-300"
              >
                <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 p-2 shadow-md">
                  <ArchiveIcon className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Play Archived Games</div>
                  <div className="text-sm opacity-80">Browse past puzzles while you wait</div>
                </div>
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const word_puzzle = current_schedule.puzzle;

  const script = await getCachedScript();
  const word_game_msgs = await get_transliterated_word_game_msgs(script);
  const title = await lipi_parivartak(word_puzzle.title, DEFAULT_DATA_SCRIPT, script);
  const grid_data = await Promise.all(
    word_puzzle.grid_data.map(
      async (row) => await lipi_parivartak(row, DEFAULT_DATA_SCRIPT, script)
    )
  );
  return (
    <MainPagePadavali
      script={script}
      word_puzzle={word_puzzle}
      initial_script_data={{ word_msgs: word_game_msgs, title, grid_data }}
      next_schedule={next_schedule}
    />
  );
}

export const metadata: Metadata = {
  title: 'पदावली',
  description:
    'Padavali is a fun, interactive Sanskrit Puzzle that tests your creativity, expands your vocabulary, ' +
    'and lets you challenge your friends to try and beat your score.'
};
