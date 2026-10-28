'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { AiContentPreview } from '~/components/pages/puzzle/AiContentPreview';

/**
 * Admin preview of the stored AI word meanings for a padavali puzzle.
 * Meanings are saved in the DB; the backend clears and regenerates them on save
 * when the title, description or active words change. Regenerate forces a new run.
 */
export function PadavaliWordMeaningsPreview({
  puzzleId,
  slug
}: {
  puzzleId: number;
  slug: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const queryKey = trpc.public_ai.get_puzzle_word_meanings.queryKey({
    puzzle_id: puzzleId,
    puzzle_slug: slug
  });
  const query = useQuery(
    trpc.public_ai.get_puzzle_word_meanings.queryOptions(
      { puzzle_id: puzzleId, puzzle_slug: slug },
      { staleTime: Infinity, retry: 2, refetchOnWindowFocus: false }
    )
  );

  const regenerate_mut = useMutation(
    trpc.admin_ai_content.regenerate_word_meanings.mutationOptions({
      onSuccess(data) {
        queryClient.setQueryData(queryKey, data);
        toast.success('Word meanings regenerated');
      },
      onError(error) {
        toast.error('Failed to regenerate word meanings', { description: error.message });
      }
    })
  );

  const words = query.data?.words ?? [];

  return (
    <AiContentPreview
      title="AI Word Meanings"
      label="word meanings"
      count={query.data?.words.length}
      countNoun="word"
      description="Saved meanings used in-game for hints & word explanations. They regenerate automatically on save when the title, description or words change; use Regenerate to replace them with a fresh AI run."
      query={query}
      onRefresh={() => void queryClient.invalidateQueries({ queryKey })}
      onRegenerate={() => regenerate_mut.mutate({ puzzle_id: puzzleId })}
      isRegenerating={regenerate_mut.isPending}
      emptyText={
        words.length === 0
          ? 'No meanings yet — add words and save the puzzle to generate them.'
          : null
      }
    >
      {words.map((item, idx) => (
        <li key={`${item.word}-${idx}`} className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="flex items-baseline gap-2 text-xs font-semibold">
            <span className="shrink-0 text-muted-foreground tabular-nums">{idx + 1}.</span>
            <span>{item.word}</span>
          </p>
          <p className="mt-0.5 pl-5 text-xs leading-relaxed text-muted-foreground">
            {item.meaning}
          </p>
        </li>
      ))}
    </AiContentPreview>
  );
}
