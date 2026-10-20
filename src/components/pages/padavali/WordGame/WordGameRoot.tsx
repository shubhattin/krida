'use client';

import { useRef, useEffect, useMemo, useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from '~/state/script_list';
import { transliterate_custom } from '~/tools/transliterator';
import { FONT_INFO } from '~/state/script_font_data';
import { get_transliterated_word_game_msgs, type word_game_msgs } from './msgs';
import { GameContoller, formatTime } from './GameController';
import { GameInfo } from './GameInfo';
import { GameGrid } from './GameGrid';
import { GameHelp } from './Help';
import { AIWordExplanations } from './AIWordExplanations';
import { createStore, Provider, useAtom, useSetAtom } from 'jotai';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { cn } from '~/lib/utils';
import { Lightbulb, Sparkles, Square, Timer } from 'lucide-react';
import { copy_text_to_clipboard } from '~/tools/kry';
import { toast } from 'sonner';
import { get_puzzle_share_url } from './GameInfo';
import { useTRPC } from '~/api/client';
import { useNavigate } from '@tanstack/react-router';
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
  practice_mode_atom,
  game_session_nonce_atom,
  revealed_word_atom,
  PADAVLI_REVEAL_COOLDOWN_PERIOD_MS,
  type CellPosition
} from './game_state';
import { AppContext } from '~/components/AppDataContext';
import type { location_list_type } from '~/db/types';
import GameMetricsCollector from './GameMetricsCollector';
import { useQueryClient } from '@tanstack/react-query';
import {
  MorePuzzlesAccordion,
  CompletionMorePuzzlesCarousel,
  getCarouselPuzzlesQueryFn
} from '~/components/pages/padavali/WordGame/MorePuzzlesCarousel';
import { attachment_schema } from '~/db/db_shared_vals';
import { z } from 'zod';
import { PuzzleHeader, PuzzleShareButton } from '~/components/pages/puzzle/PuzzleHeader';
import { findAllTraversals } from '~/tools/puzzle/puzzle_tools';
import { MediaAttachments } from '~/components/pages/puzzle/MediaAttachments';
import { resolveAttachmentsWithDefaults } from '~/util/puzzle/attachments';

export type WordGameProps = {
  grid_data: string[][];
  dims: number[];
  word_list: string[];
  listed: boolean;
  title: string;
  description: string;
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
  const puzzleId = props.id;
  const location = props.location;

  // Recreate the jotai store only when switching puzzles (or play location).
  // Loader arrays/objects (`dims`, `word_list`, `grid_data`, `word_msgs`) get new
  // identities after Start hydration/refetch; using them as deps wiped started.
  const jotaiStore = useMemo(() => {
    const store = createStore();
    store.set(title_current_atom, props.initial_script_data.title);
    store.set(grid_data_current_atom, props.initial_script_data.grid_data);
    store.set(grid_dimensions_atom, [props.dims[0], props.dims[1]]);
    store.set(started_atom, false);
    store.set(completed_atom, false);
    store.set(practice_mode_atom, false);
    store.set(game_session_nonce_atom, 0);
    store.set(current_selection_atom, []);
    store.set(found_words_atom, []);
    store.set(revealed_word_atom, null);
    store.set(seconds_atom, 0);
    store.set(total_attempts_atom, 0);
    store.set(word_msgs_atom, props.initial_script_data.word_msgs);
    store.set(original_word_list_atom, props.word_list);
    store.set(puzzle_slug_atom, props.puzzle_slug);
    store.set(description_current_atom, props.description);
    return store;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when puzzle identity changes
  }, [puzzleId, location]);

  return (
    <>
      <ActivePuzzleRegistrar puzzleId={puzzleId} />
      <Provider store={jotaiStore} key={`${puzzleId}-${location}`}>
        <WordGame {...props} />
      </Provider>
    </>
  );
}

/** Small ghost Stop control attached to the timer; confirms before discarding progress. */
const StopGameButton = ({ timerRef }: { timerRef: React.RefObject<NodeJS.Timeout | null> }) => {
  const [, setStarted] = useAtom(started_atom);
  const [, setCompleted] = useAtom(completed_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const [foundWords, setFoundWords] = useAtom(found_words_atom);
  const [, setSeconds] = useAtom(seconds_atom);
  const [, setCurrentSelection] = useAtom(current_selection_atom);
  const [, setTotalAttempts] = useAtom(total_attempts_atom);
  const [, setPracticeMode] = useAtom(practice_mode_atom);
  const [, setRevealedWord] = useAtom(revealed_word_atom);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stopGame = () => {
    setStarted(false);
    setFoundWords([]);
    setCurrentSelection([]);
    setTotalAttempts(0);
    setCompleted(false);
    setPracticeMode(false);
    setSeconds(0);
    setRevealedWord(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (foundWords.length > 0 ? setConfirmOpen(true) : stopGame())}
        aria-label={wordMsgs.stop}
        title={wordMsgs.stop}
        className={cn(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
          'text-muted-foreground transition-colors',
          'hover:bg-red-500/15 hover:text-red-600 active:scale-90 dark:hover:text-red-400'
        )}
      >
        <Square className="size-3 fill-current" />
      </button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop this game?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress ({foundWords.length} words found) and time will be reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                stopGame();
                setConfirmOpen(false);
              }}
            >
              {wordMsgs.stop}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/** Soft amber Reveal lifeline while a game is active. */
const RevealButton = ({ original_grid_data }: { original_grid_data: string[][] }) => {
  const { script } = useContext(AppContext);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const [foundWords] = useAtom(found_words_atom);
  const [wordList] = useAtom(original_word_list_atom);
  const [gridDimensions] = useAtom(grid_dimensions_atom);
  const [revealedWord, setRevealedWord] = useAtom(revealed_word_atom);
  const [isRevealCooling, setIsRevealCooling] = useState(false);
  const revealCooldownTimerRef = useRef<number | null>(null);

  const font_info = FONT_INFO[script!];

  const remainingWords = wordList.filter((w) => !foundWords.some((fw) => fw.word === w));
  const canReveal = remainingWords.length > 0;

  useEffect(() => {
    return () => {
      if (revealCooldownTimerRef.current !== null) {
        window.clearTimeout(revealCooldownTimerRef.current);
      }
    };
  }, []);

  const handleReveal = () => {
    if (!canReveal || isRevealCooling) return;

    // Prefer a different word than the one currently highlighted when possible
    const candidates =
      remainingWords.length > 1 && revealedWord
        ? remainingWords.filter((w) => w !== revealedWord.word)
        : remainingWords;
    const word = candidates[Math.floor(Math.random() * candidates.length)]!;
    const dims: [number, number] =
      gridDimensions[0] > 0
        ? gridDimensions
        : [original_grid_data.length, original_grid_data[0]?.length ?? 0];
    const traversals = findAllTraversals(original_grid_data, dims, [word]).get(0) ?? [];
    if (traversals.length === 0) return;

    const path = traversals[Math.floor(Math.random() * traversals.length)]!;
    const cells: CellPosition[] = path.map(([row, col]) => ({ row, col }));
    setRevealedWord({ cells, word });

    setIsRevealCooling(true);
    if (revealCooldownTimerRef.current !== null) {
      window.clearTimeout(revealCooldownTimerRef.current);
    }
    revealCooldownTimerRef.current = window.setTimeout(() => {
      setIsRevealCooling(false);
      revealCooldownTimerRef.current = null;
    }, PADAVLI_REVEAL_COOLDOWN_PERIOD_MS);
  };

  return (
    <motion.button
      type="button"
      onClick={handleReveal}
      disabled={!canReveal}
      aria-disabled={!canReveal || isRevealCooling}
      aria-busy={isRevealCooling}
      aria-label={wordMsgs.reveal}
      title={isRevealCooling ? 'Cooling down…' : wordMsgs.reveal}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'relative flex h-8 shrink-0 items-center justify-center gap-1.5 overflow-hidden',
        'rounded-full border px-2.5 text-sm font-semibold shadow-sm backdrop-blur-md sm:px-3',
        'border-amber-500/30 bg-linear-to-r from-orange-50/90 to-amber-50/80 text-amber-800',
        'dark:border-amber-400/35 dark:from-orange-950/70 dark:to-amber-950/60 dark:text-amber-200',
        !isRevealCooling &&
          'hover:from-orange-100 hover:to-amber-100 hover:text-amber-900 active:scale-95 dark:hover:from-orange-900/80 dark:hover:to-amber-900/70 dark:hover:text-amber-100',
        isRevealCooling && 'cursor-default opacity-80',
        'disabled:pointer-events-none disabled:opacity-40',
        font_info.className
      )}
    >
      {isRevealCooling ? (
        <motion.span
          key="reveal-cooldown-fill"
          aria-hidden
          className="pointer-events-none absolute inset-0 origin-left bg-amber-500/25 dark:bg-amber-300/20"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: PADAVLI_REVEAL_COOLDOWN_PERIOD_MS / 1000,
            ease: 'linear'
          }}
        />
      ) : null}
      <Lightbulb className="relative z-10 size-4 shrink-0" />
      <span className="relative z-10 hidden sm:inline">{wordMsgs.reveal}</span>
    </motion.button>
  );
};

const get_general_share_msg = (name: string, slug: string, description: string) => {
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

function overscrollBehaviorFor(started: boolean, completed: boolean) {
  return started && !completed ? 'contain' : 'auto';
}

function shouldShowAccordion(completed: boolean, location: location_list_type) {
  return !completed && (location === 'main_page' || location === 'view_page');
}

function LeaveGameDialog({
  pendingUrl,
  onCancel,
  onLeave
}: {
  pendingUrl: string | null;
  onCancel: () => void;
  onLeave: () => void;
}) {
  return (
    <AlertDialog
      open={!!pendingUrl}
      onOpenChange={(open) => {
        if (!open) onCancel();
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
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave}>Leave Game</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function WordGameHeader({
  title,
  description,
  script,
  onScriptChange,
  fontInfo,
  listed,
  onShare,
  hint,
  showBackLink
}: {
  title: string;
  description: string | null;
  script: ScriptType;
  onScriptChange: (script: ScriptType) => void;
  fontInfo: (typeof FONT_INFO)[ScriptType];
  listed: boolean;
  onShare: () => Promise<void> | void;
  hint: React.ReactNode;
  showBackLink: boolean;
}) {
  return (
    <PuzzleHeader
      title={title}
      description={description}
      fontClassName={fontInfo.className}
      backToGame={showBackLink ? 'padavali' : undefined}
      toolbar={
        <>
          <ScriptSelector script={script} onScriptChange={onScriptChange} showBetaBadge compact />
          {listed ? <PuzzleShareButton onShare={() => void onShare()} /> : null}
        </>
      }
      actions={hint}
    />
  );
}

function PracticeModeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm dark:border-amber-600/40 dark:bg-amber-950/50 dark:text-amber-200">
      <Sparkles className="size-3" />
      Practice mode
    </span>
  );
}

/** Timer, found-words progress, and Stop / Reveal on one row while playing. */
function ActiveGameBar({
  timerRef,
  originalGridData
}: {
  timerRef: React.RefObject<NodeJS.Timeout | null>;
  originalGridData: string[][];
}) {
  const [seconds] = useAtom(seconds_atom);
  const [foundWords] = useAtom(found_words_atom);
  const [wordList] = useAtom(original_word_list_atom);
  const [wordMsgs] = useAtom(word_msgs_atom);
  const percent = wordList.length > 0 ? (foundWords.length / wordList.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto mb-3 flex w-full max-w-lg items-center gap-2 text-sm sm:mb-4 sm:gap-2.5"
    >
      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card/70 py-0.5 pr-0.5 pl-2.5 backdrop-blur-md">
        <span className="inline-flex items-center gap-2" title={wordMsgs.time_elapsed}>
          <Timer className="size-3.5 text-primary" aria-hidden />
          <span className="sr-only">{wordMsgs.time_elapsed}</span>
          <span className="font-mono font-semibold tabular-nums">{formatTime(seconds)}</span>
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <StopGameButton timerRef={timerRef} />
      </div>
      <div
        role="progressbar"
        aria-label={wordMsgs.found_words}
        aria-valuenow={foundWords.length}
        aria-valuemin={0}
        aria-valuemax={wordList.length}
        className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/70"
      >
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-blue-500 to-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span
        className="shrink-0 rounded-lg border border-blue-300/60 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 tabular-nums dark:border-blue-500/30 dark:bg-blue-950/50 dark:text-blue-200"
        title={wordMsgs.found_words}
      >
        {foundWords.length}/{wordList.length}
      </span>
      <RevealButton original_grid_data={originalGridData} />
    </motion.div>
  );
}

function GameControlSection({
  started,
  completed,
  timerRef,
  originalGridData
}: {
  started: boolean;
  completed: boolean;
  timerRef: React.RefObject<NodeJS.Timeout | null>;
  originalGridData: string[][];
}) {
  if (started && !completed) {
    return <ActiveGameBar timerRef={timerRef} originalGridData={originalGridData} />;
  }

  // On completion: side-by-side replay + stats on desktop
  return (
    <motion.div
      className="mx-auto mb-4 flex w-full max-w-2xl flex-col gap-3 sm:mb-5 sm:flex-row sm:items-stretch sm:gap-4"
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.45 }}
    >
      <GameContoller timerRef={timerRef} />
      <GameInfo />
    </motion.div>
  );
}

function MediaSidebar({ attachments }: { attachments: z.infer<typeof attachment_schema>[] }) {
  return (
    <div className="order-2 lg:order-1 lg:col-span-3">
      <MediaAttachments attachments={resolveAttachmentsWithDefaults(attachments.map((v) => v))} />
    </div>
  );
}

function WordGame({
  children,
  id: puzzle_id,
  title: org_title,
  grid_data: org_grid_data,
  description,
  onChangeCompleted,
  location,
  puzzle_slug,
  attachments,
  listed
}: WordGameProps & { id: number }) {
  const { script, setScript } = useContext(AppContext);
  const [, setGridData] = useAtom(grid_data_current_atom);
  const [title, setTitle] = useAtom(title_current_atom);
  const [, setWordMsgs] = useAtom(word_msgs_atom);
  const [started] = useAtom(started_atom);
  const [completed] = useAtom(completed_atom);
  const [practiceMode] = useAtom(practice_mode_atom);
  const [pendingUrl, setPendingUrl] = useAtom(pending_navigation_url_atom);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['listed_puzzles_carousel', script, puzzle_slug, puzzle_id],
      queryFn: getCarouselPuzzlesQueryFn(script, puzzle_slug, puzzle_id)
    });
    void queryClient.prefetchQuery(
      trpc.public_ai.get_puzzle_word_meanings.queryOptions({
        puzzle_id,
        puzzle_slug
      })
    );
  }, [puzzle_id, puzzle_slug, trpc, script, queryClient]);

  // SAFETY: AppContext only ever stores valid ScriptType values in script
  const font_info = FONT_INFO[script as ScriptType];
  const gameInProgress = started && !completed;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [description_transliterated, setDescriptionTransliterated] =
    useAtom(description_current_atom);

  useEffect(() => {
    if (onChangeCompleted) {
      onChangeCompleted(completed);
    }
  }, [completed, onChangeCompleted]);

  // transliteration
  useEffect(() => {
    transliterate_custom(org_grid_data.flat(), DEFAULT_DATA_SCRIPT, script!).then((grid_cells) => {
      let cell_i = 0;
      setGridData(org_grid_data.map((row) => row.map(() => grid_cells[cell_i++]!)));
    });

    transliterate_custom(org_title, DEFAULT_DATA_SCRIPT, script!).then((title) => {
      setTitle(title);
    });

    get_transliterated_word_game_msgs(script!).then((word_msgs) => {
      setWordMsgs(word_msgs);
    });
    if (description) {
      transliterate_custom(description, DEFAULT_DATA_SCRIPT, script!).then((description) => {
        setDescriptionTransliterated(description);
      });
    }
  }, [
    script,
    org_grid_data,
    org_title,
    description,
    setGridData,
    setTitle,
    setWordMsgs,
    setDescriptionTransliterated
  ]);

  // Prevent page refresh/navigation during active game
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (!started || completed) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show confirmation dialog when trying to leave/refresh during active game
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers require a return value
    };

    const handlePopState = () => {
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

  const showAccordion = shouldShowAccordion(completed, location);
  const showCompletionCarousel = completed;

  const handleShare = async () => {
    const text = get_general_share_msg(title, puzzle_slug, description);
    try {
      if (navigator.share) {
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
      // SAFETY: navigator.share rejections are DOMException errors carrying .name
      if ((err as Error).name !== 'AbortError') {
        console.log('Error sharing:', err);
      }
    }
  };

  return (
    <div
      className="w-full pb-6 sm:pb-12"
      style={{
        // Prevent iOS Safari bounce and zoom during game
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: overscrollBehaviorFor(started, completed)
      }}
    >
      <LeaveGameDialog
        pendingUrl={pendingUrl}
        onCancel={() => setPendingUrl(null)}
        onLeave={() => {
          if (pendingUrl) {
            navigate({ href: pendingUrl });
            setPendingUrl(null);
          }
        }}
      />

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
        <WordGameHeader
          title={title}
          description={description ? description_transliterated : null}
          // SAFETY: AppContext only ever stores valid ScriptType values in script
          script={script as ScriptType}
          onScriptChange={setScript}
          fontInfo={font_info}
          listed={listed}
          onShare={handleShare}
          showBackLink={location === 'list_page'}
          hint={gameInProgress && practiceMode ? <PracticeModeBadge /> : null}
        />

        {/* More Puzzles accordion */}
        {showAccordion && (
          <div className="mb-3 w-full sm:mb-4">
            <MorePuzzlesAccordion excludeSlug={puzzle_slug} excludeId={puzzle_id} />
          </div>
        )}

        {/* Game controller + info — on completion, use centered layout with more breathing room */}
        {started && (
          <GameControlSection
            started={started}
            completed={completed}
            timerRef={timerRef}
            originalGridData={org_grid_data}
          />
        )}

        {/* Main Game Container */}
        <div
          className={cn(
            'grid grid-cols-1 gap-y-3.5 sm:gap-y-5 md:gap-y-6 lg:grid-cols-12 lg:gap-x-4 xl:gap-x-5'
          )}
        >
          {/* Game Controls & Progress - Left Sidebar on large screens, top on mobile */}
          <MediaSidebar attachments={attachments} />

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
              <AIWordExplanations
                puzzle_id={puzzle_id}
                puzzle_slug={puzzle_slug}
                timerRef={timerRef}
              />
            </div>
          </div>

          {/* Help Section - Right Sidebar on large screens, bottom on mobile */}
          <div className="order-3 lg:col-span-3 lg:ml-0 xl:ml-0 2xl:ml-0">
            <div className="lg:sticky lg:top-20">
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
