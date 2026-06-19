'use client';

import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { transliterate } from 'lipilekhika';
import Link from 'next/link';
import { SearchIcon, ExternalLinkIcon } from 'lucide-react';
import { ScriptSelector } from '~/components/pages/main/ScriptSelector';
import Icon from '~/tools/Icon';
import { LanguageIcon } from '~/components/icons';
import { AppContext } from '~/components/AppDataContext';
import { cn } from '~/lib/utils';
import { FONT_INFO } from '~/state/script_font_data';
import type { ListedPuzzlesType } from '~/util/cache.server/cache_loaders';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { DEFAULT_DATA_SCRIPT, type ScriptType } from '~/state/script_list';
import { motion } from 'framer-motion';
import { PuzzlePreviewCard } from '~/components/pages/main/PuzzlePreviewCard';
import {
  mergeDisplayPuzzles,
  mapListedPuzzlesForDisplay,
  NORMAL_TITLE_SCRIPT,
  type DisplayPuzzle
} from '~/components/pages/main/listed_puzzle_display';
import { matchesPuzzleWordSearch } from '~/util/puzzle/search';

const EMBED_PAGE_LIMIT = 8;

type Props = {
  listed_puzzles: ListedPuzzlesType;
  listed_puzzles_init_transliterated: DisplayPuzzle[];
};

export const ListedPuzzlesBrowseEmbed = ({
  listed_puzzles: listed_puzzles_org,
  listed_puzzles_init_transliterated
}: Props) => {
  const { script } = useContext(AppContext);

  const normal_titles_q = useQuery({
    queryKey: ['listed_puzzle_title_normal', listed_puzzles_org.map((p) => `${p.id}:${p.title}`)],
    queryFn: async () =>
      transliterate(
        listed_puzzles_org.map((p) => p.title),
        DEFAULT_DATA_SCRIPT,
        NORMAL_TITLE_SCRIPT,
        {
          'all_to_normal:replace_avagraha_with_a': true,
          'all_to_normal:replace_pancham_varga_varna_with_n': true
        }
      ),
    initialData: listed_puzzles_init_transliterated.every((p) => p.title_normal != null)
      ? listed_puzzles_init_transliterated.map((p) => p.title_normal)
      : undefined,
    staleTime: Infinity
  });

  const listed_puzzle_list_q = useQuery({
    queryKey: ['listed_puzzle_list', 'v2', script],
    queryFn: async () => {
      const puzzle_texts = listed_puzzles_org.flatMap((p) =>
        p.description ? [p.title, p.description] : [p.title]
      );
      const transliterated_texts = await transliterate(puzzle_texts, DEFAULT_DATA_SCRIPT, script);
      return mapListedPuzzlesForDisplay(
        listed_puzzles_org,
        transliterated_texts,
        normal_titles_q.data!
      );
    },
    placeholderData: listed_puzzles_init_transliterated,
    enabled: normal_titles_q.data !== undefined
  });

  const display_puzzles = useMemo(
    (): DisplayPuzzle[] =>
      mergeDisplayPuzzles(
        listed_puzzle_list_q.data ?? listed_puzzles_init_transliterated,
        listed_puzzles_org,
        normal_titles_q.data
      ),
    [
      listed_puzzle_list_q.data,
      listed_puzzles_init_transliterated,
      listed_puzzles_org,
      normal_titles_q.data
    ]
  );

  return <BrowseEmbedView puzzles={display_puzzles} />;
};

const BrowseEmbedView = ({ puzzles }: { puzzles: DisplayPuzzle[] }) => {
  const { script, setScript } = useContext(AppContext);
  const font_info = FONT_INFO[script!];
  const [searchQuery, setSearchQuery] = useState('');
  const [lipi_lekhika_typing, setLipiLekhikaTyping] = useState(false);

  const typing_ctx = useMemo(() => createTypingContext(script!), [script]);
  useEffect(() => {
    void typing_ctx.ready;
  }, [typing_ctx]);

  const filteredPuzzles = useMemo(
    () => puzzles.filter((puzzle) => matchesPuzzleWordSearch(puzzle, searchQuery)),
    [puzzles, searchQuery]
  );

  const visiblePuzzles = filteredPuzzles.slice(0, EMBED_PAGE_LIMIT);

  if (puzzles.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-8">
      <div className="mb-4 flex items-center justify-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800 sm:text-xl dark:text-slate-100">
          Browse puzzles
        </h2>
        <Link
          href="/padavali/puzzles"
          className="flex items-center justify-center gap-0.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-2 py-0.5 text-xs leading-none font-medium text-blue-600 no-underline transition-all duration-150 hover:bg-blue-100 hover:text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/50"
        >
          <ExternalLinkIcon className="relative size-3 shrink-0 translate-y-[-1.5px]" />
          <span>View all</span>
        </Link>
      </div>

      <div className="mb-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <InputGroup className="w-full sm:flex-1">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onBeforeInput={(e) =>
              handleTypingBeforeInputEvent(
                typing_ctx,
                e,
                (newValue) => setSearchQuery(newValue),
                lipi_lekhika_typing
              )
            }
            onBlur={() => typing_ctx.clearContext()}
            onKeyDown={(e) => {
              if (e.altKey && (e.key === 'x' || e.key === 'X' || e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                setLipiLekhikaTyping((prev) => !prev);
                return;
              }
              clearTypingContextOnKeyDown(e, typing_ctx);
            }}
            placeholder="Search by title or description"
            aria-label="Search puzzles"
          />
        </InputGroup>
        <Label className="inline-flex shrink-0 items-center justify-center gap-2 font-medium">
          <Switch
            checked={lipi_lekhika_typing}
            onCheckedChange={setLipiLekhikaTyping}
            className="-mt-1"
            aria-label="Enable Lipi Lekhika typing in search"
          />
          <Icon src={LanguageIcon} className="-mt-1 size-6.5" />
        </Label>
        <div className="flex shrink-0 items-center justify-center gap-2 sm:justify-end">
          <ScriptSelector script={script} onScriptChange={setScript} />
          {font_info.experimental && (
            <span className="inline-flex items-center rounded-full bg-orange-100 px-1 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
              Beta
            </span>
          )}
        </div>
      </div>

      {filteredPuzzles.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No puzzles match your search
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {visiblePuzzles.map((puzzle, index) => (
            <motion.div
              key={puzzle.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <PuzzlePreviewCard puzzle={puzzle} />
            </motion.div>
          ))}
        </div>
      )}

      {filteredPuzzles.length > EMBED_PAGE_LIMIT && (
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {EMBED_PAGE_LIMIT} of {filteredPuzzles.length} matches.{' '}
          <a
            href="/padavali/puzzles"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            View all
          </a>
        </p>
      )}
    </div>
  );
};

export type { DisplayPuzzle };
