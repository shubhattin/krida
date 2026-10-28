'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import type { PadajalaPuzzleWord } from '~/db/schema_zod';
import { AiContentPreview } from '~/components/pages/puzzle/AiContentPreview';
import { padajalaActiveWords } from '~/util/puzzle/word_list';

/**
 * Admin preview of the stored AI more hints for a padajala puzzle, one per active word.
 * Hints are saved in the DB; the backend clears and regenerates them on save when the
 * title, description or active words/clues change. Regenerate forces a new run.
 */
export function PadajalaMoreHintsPreview({
  puzzleId,
  slug,
  wordList
}: {
  puzzleId: number;
  slug: string;
  wordList: PadajalaPuzzleWord[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const queryKey = trpc.public_ai.get_padajala_more_hints.queryKey({
    puzzle_id: puzzleId,
    puzzle_slug: slug
  });
  const query = useQuery(
    trpc.public_ai.get_padajala_more_hints.queryOptions(
      { puzzle_id: puzzleId, puzzle_slug: slug },
      { staleTime: Infinity, retry: 2, refetchOnWindowFocus: false }
    )
  );

  const regenerate_mut = useMutation(
    trpc.admin_ai_content.regenerate_more_hints.mutationOptions({
      onSuccess(data) {
        queryClient.setQueryData(queryKey, data);
        toast.success('More hints regenerated');
      },
      onError(error) {
        toast.error('Failed to regenerate more hints', { description: error.message });
      }
    })
  );

  // Hints are generated one per active word, in order
  const activeWords = padajalaActiveWords(wordList);
  const hints = query.data?.hints ?? [];

  return (
    <AiContentPreview
      title="AI More Hints"
      label="more hints"
      count={query.data?.hints.length}
      countNoun="hint"
      description="Saved extra clues shown in-game alongside each short clue. They regenerate automatically on save when the title, description, words or clues change; use Regenerate to replace them with a fresh AI run."
      query={query}
      onRefresh={() => void queryClient.invalidateQueries({ queryKey })}
      onRegenerate={() => regenerate_mut.mutate({ puzzle_id: puzzleId })}
      isRegenerating={regenerate_mut.isPending}
      emptyText={
        activeWords.length === 0 || hints.length === 0
          ? 'No hints yet — add words and save the puzzle to generate them.'
          : null
      }
    >
      {activeWords.map((entry, idx) => (
        <li key={`${entry.word}-${idx}`} className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="flex items-baseline gap-2 text-xs font-semibold">
            <span className="shrink-0 text-muted-foreground tabular-nums">{idx + 1}.</span>
            <span>{entry.word_dev}</span>
            <span className="font-normal text-muted-foreground">{entry.word}</span>
          </p>
          <p className="mt-0.5 pl-5 text-xs text-muted-foreground">{entry.description}</p>
          <p className="mt-0.5 pl-5 text-xs leading-relaxed">{hints[idx]}</p>
        </li>
      ))}
    </AiContentPreview>
  );
}
