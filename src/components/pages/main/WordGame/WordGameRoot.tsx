'use client';

import { useRef, useEffect, useMemo, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { transliterate } from 'lipilekhika';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from '~/state/script_list';
import { FONT_INFO } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs, type word_game_msgs } from './msgs';
import { GameContoller } from './GameController';
import { GameInfo } from './GameInfo';
import { GameGrid } from './GameGrid';
import { GameHelp } from './Help';
import { AIWordExplanations } from './AIWordExplanations';
import { createStore, Provider, useAtom, useSetAtom } from 'jotai';
import { ScriptSelector } from '~/components/pages/main/ScriptSelector';
import { cn } from '~/lib/utils';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { Calendar, InfoIcon, Sparkles } from 'lucide-react';
import { IoShareSocialOutline } from 'react-icons/io5';
import { copy_text_to_clipboard } from '~/tools/kry';
import { toast } from 'sonner';
import { get_puzzle_share_url } from './GameInfo';
import { client_q } from '~/api/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import {
  completed_atom,
  grid_data_current_atom,
  seconds_atom,
  started_atom,
  title_current_atom,
  total_attempts_atom,
  current_selection_atom,
  found_words_atom,
  grid_dimensions_atom,
  word_msgs_atom,
  original_word_list_atom,
  pending_navigation_url_atom,
  puzzle_slug_atom,
  active_puzzle_id_atom,
  description_current_atom,
  practice_mode_atom
} from './game_state';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { FaLink, FaRegStopCircle } from 'react-icons/fa';
import { AppContext } from '~/components/AppDataContext';
import type { location_list_type } from '~/db/types';
import { FiYoutube } from 'react-icons/fi';
import GameMetricsCollector from './GameMetricsCollector';
import { useQueryClient } from '@tanstack/react-query';
import {
  MorePuzzlesAccordion,
  CompletionMorePuzzlesCarousel,
  getCarouselPuzzlesQueryFn
} from '~/components/pages/main/WordGame/MorePuzzlesCarousel';
import { attachment_schema, DEFAULT_YOUTUBE_EMBED } from '~/db/db_shared_vals';
import { z } from 'zod';
import { RiPlayList2Fill } from 'react-icons/ri';
import { IoLogoYoutube } from 'react-icons/io';
import { HintDialog } from './HintDialog';

export type WordGameProps = {
  grid_data: string[][];
  dims: number[];
  word_list: string[];
  title: string;
  description: string | null;
  id: number;
  children?: React.ReactNode;
  attachments: z.infer<typeof attachment_schema>[];
  initial_script_data: {
    word_msgs: typeof word_game_msgs;
    title: string;
    grid_data: string[][];
  };
  location: location_list_type;
  puzzle_slug: string;
  onChangeCompleted?: (completed: boolean) => void;
  next_schedule?: {
    id: number;
    start_time: Date;
    puzzle: {
      id: number;
    };
  };
};

function ActivePuzzleRegistrar({ puzzleId }: { puzzleId: number }) {
  const setActivePuzzleId = useSetAtom(active_puzzle_id_atom);

  useEffect(() => {
    setActivePuzzleId(puzzleId);
    return () => setActivePuzzleId(null);
  }, [puzzleId, setActivePuzzleId]);

  return null;
}

export default function WordGameRoot(
  props: WordGameProps & {
    script: ScriptType;
  }
) {
  const jotaiStore = useMemo(() => {
    const store = createStore();
    store.set(title_current_atom, props.initial_script_data.title);
    store.set(grid_data_current_atom, props.initial_script_data.grid_data);
    store.set(grid_dimensions_atom, [props.dims[0], props.dims[1]]);
    store.set(started_atom, false);
    store.set(completed_atom, false);
    store.set(practice_mode_atom, false);
    store.set(current_selection_atom, []);
    store.set(found_words_atom, []);
    store.set(seconds_atom, 0);
    store.set(total_attempts_atom, 0);
    store.set(word_msgs_atom, props.initial_script_data.word_msgs);
    store.set(original_word_list_atom, props.word_list);
    store.set(puzzle_slug_atom, props.puzzle_slug);
    store.set(description_current_atom, props.description);
    return store;
  }, []);

  return (
    <>
      <ActivePuzzleRegistrar puzzleId={props.id} />
      <Provider store={jotaiStore} key={`${props.id}-${props.location}`}>
        <WordGame {...props} />
      </Provider>
    </>
  );
}

// Compact Stop Button Component
const CompactStopButton = ({
  timerRef,
  className
}: {
  timerRef: React.RefObject<NodeJS.Timeout | null>;
  className?: string;
}) => {
  const { script } = useContext(AppContext);
  const [started] = useAtom(started_atom);
  const [completed, setCompleted] = useAtom(completed_atom);
  const [, setStarted] = useAtom(started_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const [, setFoundWords] = useAtom(found_words_atom);
  const [, setSeconds] = useAtom(seconds_atom);
  const [, setCurrentSelection] = useAtom(current_selection_atom);
  const [, setTotalAttempts] = useAtom(total_attempts_atom);
  const [, setPracticeMode] = useAtom(practice_mode_atom);

  const font_info = FONT_INFO[script!];

  const handleStop = () => {
    setStarted(false);
    setFoundWords([]);
    setCurrentSelection([]);
    setTotalAttempts(0);
    setCompleted(false);
    setPracticeMode(false);
    setSeconds(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  if (!started || completed) return null;

  return (
    <>
      {/* Stop Button for <lg screens - centered below game controls */}
      <div className="flex justify-center sm:-mb-2">
        <motion.button
          onClick={handleStop}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={cn(
            'group relative overflow-hidden bg-red-500',
            'rounded-lg px-3 py-1.5 font-medium text-white shadow-md hover:shadow-lg',
            'transform transition-all duration-200 hover:scale-105 active:scale-95',
            'flex items-center justify-center gap-2 text-base',
            font_info.className
          )}
        >
          <FaRegStopCircle className="-mt-1 size-4.5" />
          <span>{wordMsgs.stop}</span>
        </motion.button>
      </div>
    </>
  );
};

const get_general_share_msg = (name: string, slug: string, description: string | null) => {
  const puzzle_url = get_puzzle_share_url(slug);
  return [
    `✨ Play Padavali — a super fun, interactive Sanskrit word puzzle!`,
    '',
    `🎯 ${name}` + (description ? ` : ${description}` : ''),
    '',
    `🔗 Play now:`,
    puzzle_url,
    '',
    `📝 Play in your own script — supports Multiple Indian scripts!`
  ].join('\n');
};

function WordGame({
  children,
  id: puzzle_id,
  title: org_title,
  grid_data: org_grid_data,
  description,
  onChangeCompleted,
  location,
  puzzle_slug,
  attachments
}: WordGameProps & { id: number }) {
  const { script, setScript } = useContext(AppContext);
  const [, setGridData] = useAtom(grid_data_current_atom);
  const [title, setTitle] = useAtom(title_current_atom);
  const [, setWordMsgs] = useAtom(word_msgs_atom);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [practiceMode] = useAtom(practice_mode_atom);
  const [pendingUrl, setPendingUrl] = useAtom(pending_navigation_url_atom);
  const router = useRouter();
  const queryClient = useQueryClient();
  const utils = client_q.useUtils();

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['listed_puzzles_carousel', script, puzzle_slug, puzzle_id],
      queryFn: getCarouselPuzzlesQueryFn(script, puzzle_slug, puzzle_id)
    });
    utils.public_ai.get_puzzle_word_meanings.prefetch({
      puzzle_id,
      puzzle_slug
    });
  }, [puzzle_id, puzzle_slug, utils, script]);

  const font_info = FONT_INFO[script as ScriptType];
  const hintHiddenInPractice = practiceMode && started && !completed;
  const hintBelowMeanings = started && !completed && !practiceMode;
  const hintAtTop = !hintHiddenInPractice && !hintBelowMeanings;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [description_transliterated, setDescriptionTransliterated] =
    useAtom(description_current_atom);

  useEffect(() => {
    if (onChangeCompleted) {
      onChangeCompleted(completed);
    }
  }, [completed]);

  // transliteration
  useEffect(() => {
    transliterate(org_grid_data.flat(), DEFAULT_DATA_SCRIPT, script!).then((grid_cells) => {
      let cell_i = 0;
      setGridData(org_grid_data.map((row) => row.map(() => grid_cells[cell_i++]!)));
    });

    transliterate(org_title, DEFAULT_DATA_SCRIPT, script!).then((title) => {
      setTitle(title);
    });

    get_transliterated_word_game_msgs(script!).then((word_msgs) => {
      setWordMsgs(word_msgs);
    });
    if (description) {
      transliterate(description, DEFAULT_DATA_SCRIPT, script!).then((description) => {
        setDescriptionTransliterated(description);
      });
    }
  }, [script]);

  // Prevent page refresh/navigation during active game
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    if (!started || completed) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show confirmation dialog when trying to leave/refresh during active game
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers require a return value
    };

    const handlePopState = (e: PopStateEvent) => {
      // Prevent back/forward navigation during active game
      if (started && !completed) {
        const confirmLeave = window.confirm(
          'Are you sure you want to leave? Your current game progress will be lost.'
        );
        if (!confirmLeave) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to handle back button
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [started, completed]);

  const showAccordion = !completed && (location === 'main_page' || location === 'view_page');
  const showCompletionCarousel = completed;

  return (
    <div
      className={cn(
        'w-full bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
        'pb-6 sm:pb-12'
      )}
      style={{
        // Prevent iOS Safari bounce and zoom during game
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: started && !completed ? 'contain' : 'auto'
      }}
    >
      <AlertDialog
        open={!!pendingUrl}
        onOpenChange={(open) => {
          if (!open) setPendingUrl(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current word game progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingUrl(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingUrl) {
                  router.push(pendingUrl);
                  setPendingUrl(null);
                }
              }}
            >
              Leave Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {children}

      {/* Completion carousel — shown ABOVE the game when finished */}
      {showCompletionCarousel && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pt-3 sm:pt-4"
        >
          <CompletionMorePuzzlesCarousel excludeSlug={puzzle_slug} excludeId={puzzle_id} />
        </motion.div>
      )}

      <div className="container mx-auto max-w-7xl px-2 pt-3 sm:px-4 sm:pt-4 md:px-6 md:pt-5">
        <div className="mb-2 flex flex-col items-center gap-2 sm:mb-3">
          {hintAtTop ? (
            <HintDialog puzzle_id={puzzle_id} puzzle_slug={puzzle_slug} timerRef={timerRef} />
          ) : null}
          {hintHiddenInPractice ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm dark:border-amber-600/40 dark:bg-amber-950/50 dark:text-amber-200">
              <Sparkles className="size-3" />
              Practice mode
            </span>
          ) : null}
        </div>

        {/* Title + inline script selector (desktop: right side, mobile: below title) */}
        <div className="relative mb-2 text-center sm:mb-3">
          {/* Desktop script selector — absolutely positioned right of the title */}
          <div className="absolute top-1/2 right-0 hidden -translate-y-1/2 items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/75 px-3 py-1.5 shadow-md backdrop-blur-sm lg:flex dark:border-slate-700/60 dark:bg-slate-900/75">
            <Icon className="size-5" src={LanguageIcon} />
            <ScriptSelector script={script} onScriptChange={setScript} />
            {font_info.experimental && (
              <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                Beta
              </span>
            )}
          </div>

          {/* Puzzle title */}
          <div
            className={cn(
              'bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text py-1 text-2xl font-bold sm:text-3xl md:text-4xl dark:from-slate-100 dark:to-slate-300',
              font_info.className
            )}
          >
            {title}
            {description && (
              <Popover>
                <PopoverTrigger
                  render={<button className="ml-3 align-middle outline-none hover:brightness-75" />}
                >
                  <InfoIcon className="size-3 sm:size-4" />
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="center"
                  className="z-80 w-fit max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-slate-200 bg-linear-to-r from-amber-50 to-orange-50 px-3 py-2 shadow-xl outline-none sm:max-w-md md:max-w-lg dark:border-slate-700 dark:from-teal-950/80 dark:to-green-950/80"
                >
                  <div className="text-sm font-semibold wrap-break-word whitespace-normal text-stone-600 dark:text-stone-200">
                    {description_transliterated}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <button
              onClick={async () => {
                const text = get_general_share_msg(title, puzzle_slug, description);
                try {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    await navigator.share({
                      title: `${title} - पदावली-शब्द-क्रीडनम्`,
                      text
                    });
                  } else {
                    try {
                      await copy_text_to_clipboard(text);
                      toast.success('Puzzle link copied to clipboard');
                    } catch (err) {
                      toast.error('Could not copy to clipboard');
                      console.log('Error copying:', err);
                    }
                  }
                } catch (err) {
                  if ((err as Error).name !== 'AbortError') {
                    console.log('Error sharing:', err);
                  }
                }
              }}
              className="ml-3 inline-flex items-center justify-center align-middle text-slate-500 outline-none hover:text-slate-700 hover:brightness-75 dark:text-slate-400 dark:hover:text-slate-200"
              title="Share Puzzle"
              aria-label="Share Puzzle"
            >
              <IoShareSocialOutline className="size-3.5 sm:size-4.5" />
            </button>
          </div>

          {/* Script selector — mobile only, centered below title */}
          <div className="mt-2 flex items-center justify-center gap-1.5 lg:hidden">
            <Icon className="size-6" src={LanguageIcon} />
            <ScriptSelector script={script} onScriptChange={setScript} />
            {font_info.experimental && (
              <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                Beta
              </span>
            )}
          </div>
        </div>

        {/* More Puzzles accordion */}
        {showAccordion && (
          <div className="mb-3 w-full sm:mb-4">
            <MorePuzzlesAccordion excludeSlug={puzzle_slug} excludeId={puzzle_id} />
          </div>
        )}

        {/* Game controller + info — on completion, use centered layout with more breathing room */}
        {started && (
          <motion.div
            className={cn(
              'flex flex-col items-center justify-center',
              completed && 'mx-auto mb-4 w-full max-w-2xl sm:mb-5'
            )}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 32, duration: 0.5 }}
          >
            <motion.div
              className={cn(
                'flex items-center justify-center',
                started &&
                  !completed &&
                  'w-auto space-x-3.5 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xl sm:space-x-5 sm:px-6 md:space-x-5 md:px-8 dark:border-slate-700 dark:bg-slate-800',
                // On completion: side-by-side restart + stats on desktop
                completed && 'w-full flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4'
              )}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.08,
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.45
              }}
            >
              <GameContoller timerRef={timerRef} />
              {(started || completed) && <GameInfo />}
            </motion.div>
            <motion.div
              className="mb-4.5 pt-3 sm:mb-5.5 sm:pt-5 md:mb-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.18,
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.4
              }}
            >
              <CompactStopButton timerRef={timerRef} />
            </motion.div>
          </motion.div>
        )}

        {/* Main Game Container */}
        <div
          className={cn(
            'grid grid-cols-1 gap-y-3.5 sm:gap-y-5 md:gap-y-6 lg:grid-cols-12 lg:gap-x-4 xl:gap-x-5'
          )}
        >
          {/* Game Controls & Progress - Left Sidebar on large screens, top on mobile */}
          <div
            className={cn(
              'order-2 lg:order-1 lg:col-span-3',
              !started && 'lg:mt-10 lg:items-start'
            )}
          >
            <MediaAttachments
              attachments={(() => {
                const list = attachments.map((v) => v);
                const default_attachment = {
                  id: 0,
                  ...DEFAULT_YOUTUBE_EMBED,
                  order_index: 1
                } satisfies z.infer<typeof attachment_schema>;
                // if no then the default one
                if (list.length === 0) {
                  return [default_attachment];
                }
                const any_youtube_embed = list.some((v) => v.type === 'youtube_embed');
                if (!any_youtube_embed) {
                  list.push({
                    ...default_attachment,
                    order_index: list.length + 1
                  });
                }
                return list;
              })()}
            />
          </div>

          {/* Game Grid - Center */}
          <div className="order-1 flex flex-col items-center justify-center lg:order-2 lg:col-span-6">
            <div
              className={cn(
                'w-full max-w-lg'
                // font_info.experimental && 'max-w-full'
              )}
            >
              <GameGrid
                original_grid_data={org_grid_data}
                puzzle_id={puzzle_id}
                timerRef={timerRef}
                location={location}
              />
              <AIWordExplanations puzzle_id={puzzle_id} puzzle_slug={puzzle_slug} />
              {hintBelowMeanings ? (
                <div className="mt-3 flex justify-center sm:mt-4">
                  <HintDialog puzzle_id={puzzle_id} puzzle_slug={puzzle_slug} timerRef={timerRef} />
                </div>
              ) : null}
            </div>
          </div>

          {/* Help Section - Right Sidebar on large screens, bottom on mobile */}
          <div className="order-3 lg:col-span-3 lg:ml-0 xl:ml-0 2xl:ml-0">
            <div className="lg:sticky lg:top-6 lg:mt-12">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <GameHelp />
              </div>
            </div>
          </div>
        </div>
      </div>

      <GameMetricsCollector puzzle_id={puzzle_id} location={location} />
    </div>
  );
}

export const NextPuzzleTimePopup = ({
  next_puzzle_start_time,
  className
}: {
  next_puzzle_start_time: Date;
  className?: string;
}) => {
  return (
    <Popover>
      <PopoverTrigger
        render={<button className={cn('outline-none hover:brightness-75', className)} />}
      >
        <InfoIcon className="-mt-1 size-3 sm:size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="z-100 flex items-center gap-2 overflow-hidden rounded-xl border border-amber-200/50 bg-linear-to-r from-amber-50 to-orange-50 px-3 py-2 shadow-xl outline-none dark:border-slate-700 dark:from-teal-950/80 dark:to-green-950/80"
      >
        <Calendar className="-mt-1 size-4" />
        <span className="bg-linear-to-r from-amber-700 to-orange-500 bg-clip-text text-xs font-bold text-transparent brightness-95 dark:bg-linear-to-r dark:from-amber-300 dark:to-orange-300">
          {next_puzzle_start_time.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long'
          })}
          ,{' '}
          {next_puzzle_start_time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </span>
      </PopoverContent>
    </Popover>
  );
};

// Extract video ID from YouTube URL (including live videos)
const getYouTubeVideoId = (url: string): string | null => {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|live\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const MediaAttachments = ({
  attachments,
  className
}: {
  attachments: z.infer<typeof attachment_schema>[];
  className?: string;
}) => {
  const PROD = process.env.NODE_ENV === 'production';

  return (
    <div
      className={cn(
        'w-full space-y-1.5 p-1 sm:space-y-2',
        'flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="text=start flex items-start justify-center gap-2">
        <FiYoutube className="-mt-1 size-7 text-red-600 dark:text-red-400" />
        <span className="bg-linear-to-r from-orange-500 via-amber-500 to-yellow-600 bg-clip-text text-center text-base font-extrabold text-transparent drop-shadow-sm dark:from-amber-300 dark:via-orange-300 dark:to-yellow-200">
          Solve Together & Discuss the Puzzle
        </span>
      </div>
      <div className="space-y-1.5 sm:space-y-3">
        {attachments.map((attachment) => (
          <div key={attachment.id}>
            {attachment.type === 'link' && (
              <div className="w-full">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-x-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <FaLink className="size-4.5" />
                  {attachment.title ?? attachment.url}
                </a>
              </div>
            )}
            {attachment.type === 'youtube_video' && (
              <div className="w-full">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-x-2"
                >
                  <IoLogoYoutube className="size-5 text-red-600 group-hover:text-red-500 dark:text-red-400 dark:group-hover:text-red-300" />
                  <span className="text-blue-500 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300">
                    {attachment.title ?? attachment.url}
                  </span>
                </a>
              </div>
            )}
            {attachment.type === 'youtube_playlist' && (
              <div className="w-full">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center gap-x-2"
                >
                  <RiPlayList2Fill className="size-5 text-red-600 group-hover:text-red-500 dark:text-red-400 dark:group-hover:text-red-300" />
                  <span className="text-blue-500 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300">
                    {attachment.title ?? attachment.url}
                  </span>
                </a>
              </div>
            )}
            {attachment.type === 'youtube_embed' &&
              (() => {
                const videoId = getYouTubeVideoId(attachment.url);
                if (!videoId) return null;
                return PROD ? (
                  <div className="w-full max-w-md gap-0.5 overflow-hidden rounded-lg shadow-lg">
                    {attachment.title && (
                      <div className="flex items-center justify-center font-semibold">
                        {attachment.title}
                      </div>
                    )}
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="Discussion Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="aspect-video w-full border-0"
                    />
                  </div>
                ) : (
                  <div className="text-sm">Youtube Embed ID: {videoId}</div>
                );
              })()}
          </div>
        ))}
      </div>
    </div>
  );
};
