import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import type { KindedPuzzleDraft } from '~/agents/drafts/schemas';
import { GAME_GUIDES } from '~/agents/prompts/games';
import type { ProposePuzzleOutput } from '~/agents/ui_message';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Spinner } from '~/components/ui/spinner';
import { puzzleEditorHref, useAgentChat } from '../chat/agent_chat_context';
import { IssueList, ProposalMeta } from './ProposalMeta';
import { PuzzleDraftPreview } from './PuzzleDraftPreview';

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Review a proposal before it becomes a draft puzzle: full preview, editable slug (re-checked
 * live), new tags called out, then an explicit confirm. The server re-reads the proposal from
 * the stored chat and re-validates it, so this dialog only sends ids and the slug.
 */
export function AddPuzzleDialog({
  open,
  onOpenChange,
  toolCallId,
  proposal,
  initialCheck
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolCallId: string;
  proposal: KindedPuzzleDraft;
  initialCheck: ProposePuzzleOutput;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { chatId } = useAgentChat();
  const [slug, setSlug] = useState(initialCheck.slug);
  const [confirming, setConfirming] = useState(false);
  const debouncedSlug = useDebounced(slug.trim(), 350);

  const check_q = useQuery(
    trpc.agents.check_proposal.queryOptions(
      { chat_id: chatId, tool_call_id: toolCallId, slug: debouncedSlug },
      { enabled: open && debouncedSlug.length > 0 }
    )
  );
  const check = check_q.data ?? initialCheck;
  const checking = check_q.isFetching || debouncedSlug !== slug.trim();
  // Empty or edited-but-unchecked slug must not be submittable under the stale check.
  const slugMismatch = slug.trim() !== check.slug;
  const newTags = check.tags.filter((tag) => tag.is_new);
  const game = GAME_GUIDES[proposal.kind];

  const add_mut = useMutation(
    trpc.agents.add_puzzle.mutationOptions({
      onSuccess: (result) => {
        void queryClient.invalidateQueries({
          queryKey: trpc.agents.get_chat.queryKey({ id: chatId })
        });
        void queryClient.invalidateQueries({ queryKey: trpc.agents.list_chats.queryKey() });
        setConfirming(false);
        onOpenChange(false);
        toast.success(`Added “${result.title}” as a draft`, {
          action: {
            label: 'Open editor',
            onClick: () =>
              window.open(puzzleEditorHref(result.kind, result.puzzle_id), '_blank', 'noopener')
          }
        });
      },
      onError: (error) => {
        setConfirming(false);
        toast.error(error.message);
      }
    })
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(90dvh,52rem)] flex-col gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border/70 p-4">
            <DialogTitle>Add to {game.name}</DialogTitle>
            <DialogDescription>
              Saved as an unlisted draft. Review it in the editor before publishing.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-foreground">{proposal.draft.title}</h3>
              {proposal.draft.description ? (
                <p className="text-sm text-muted-foreground">{proposal.draft.description}</p>
              ) : null}
              <ProposalMeta tags={check.tags} collections={check.collections} className="mt-1.5" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-puzzle-slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/{proposal.kind}/</span>
                <Input
                  id="agent-puzzle-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.currentTarget.value)}
                  className="font-mono"
                  spellCheck={false}
                  autoComplete="off"
                />
                {checking ? <Spinner className="size-4 shrink-0 text-muted-foreground" /> : null}
              </div>
            </div>

            <IssueList items={check.errors} tone="error" />
            <IssueList items={check.warnings} tone="warning" />

            <div className="rounded-xl border border-border/70 p-3.5">
              <PuzzleDraftPreview proposal={proposal} />
            </div>
          </div>

          <DialogFooter className="border-t border-border/70 p-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={checking || slugMismatch || !check.ok || add_mut.isPending}
              onClick={() => setConfirming(true)}
            >
              Add as draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add “{proposal.draft.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Creates an unlisted {game.name} puzzle at{' '}
              <span className="font-mono">
                /{proposal.kind}/{check.slug}
              </span>
              {newTags.length > 0
                ? `, and ${newTags.length} new tag${newTags.length === 1 ? '' : 's'} (${newTags
                    .map((tag) => tag.slug)
                    .join(', ')})`
                : ''}
              {check.collections.length > 0
                ? `, linked to ${check.collections.map((collection) => collection.title).join(', ')}`
                : ''}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={add_mut.isPending}>Back</AlertDialogCancel>
            <Button
              disabled={add_mut.isPending}
              onClick={() =>
                add_mut.mutate({ chat_id: chatId, tool_call_id: toolCallId, slug: check.slug })
              }
            >
              {add_mut.isPending ? <Spinner /> : null}
              Add puzzle
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
