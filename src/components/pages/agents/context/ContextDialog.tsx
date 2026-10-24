import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { Button } from '~/components/ui/button';
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle
} from '~/components/ui/code-block';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { Spinner } from '~/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

const approxTokens = (text: string) => Math.round(text.length / 3.5);

/**
 * Everything the agent reads before the conversation: system prompt, database schema and (for
 * the Puzzle Creator) the frozen puzzle context, with a refresh for when the catalog changed.
 */
export function ContextDialog({
  chatId,
  open,
  onOpenChange,
  canRefresh
}: {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canRefresh: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const context_q = useQuery(
    trpc.agents.get_context.queryOptions({ id: chatId }, { enabled: open })
  );
  const sections = context_q.data?.sections ?? [];
  const [tab, setTab] = useState<string | null>(null);
  const activeTab = tab ?? sections.at(-1)?.id ?? 'system_prompt';

  const refresh_mut = useMutation(
    trpc.agents.refresh_context.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.agents.get_context.queryKey({ id: chatId })
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.agents.get_chat.queryKey({ id: chatId })
        });
        toast.success('Context refreshed. The next reply rebuilds the prompt cache.');
      },
      onError: (error) => toast.error(error.message)
    })
  );

  const snapshot = context_q.data?.snapshot;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88dvh,56rem)] flex-col gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="gap-1 border-b border-border/70 p-4 pr-12">
          <DialogTitle>Agent context</DialogTitle>
          <DialogDescription>
            What the agent reads before your messages, in this order.
            {snapshot ? (
              <>
                {' '}
                Puzzle context built{' '}
                {formatDistanceToNowStrict(new Date(snapshot.built_at), { addSuffix: true })} ·{' '}
                {snapshot.counts.puzzles} puzzles · {snapshot.counts.tags} tags ·{' '}
                {snapshot.counts.collections} collections.
              </>
            ) : null}
          </DialogDescription>
          {canRefresh ? (
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={refresh_mut.isPending}
                onClick={() => refresh_mut.mutate({ id: chatId })}
              >
                {refresh_mut.isPending ? <Spinner /> : <RefreshCwIcon />}
                Refresh context
              </Button>
              <span className="ml-2 text-xs text-muted-foreground">
                Use after puzzles, tags or collections change.
              </span>
            </div>
          ) : null}
        </DialogHeader>

        {context_q.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setTab(String(value))}
            className="flex min-h-0 flex-1 flex-col gap-3 p-4"
          >
            <TabsList>
              {sections.map((section, index) => (
                <TabsTrigger key={section.id} value={section.id}>
                  {index + 1}. {section.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map((section) => (
              <TabsContent key={section.id} value={section.id} className="min-h-0 flex-1">
                <CodeBlock size="sm" className="h-full">
                  <CodeBlockHeader>
                    <CodeBlockTitle>
                      {section.title} · ~{approxTokens(section.content).toLocaleString()} tokens
                    </CodeBlockTitle>
                    <CodeBlockActions>
                      <CodeBlockCopyButton value={section.content} />
                    </CodeBlockActions>
                  </CodeBlockHeader>
                  <CodeBlockContent wrap className="min-h-0 flex-1">
                    {section.content}
                  </CodeBlockContent>
                </CodeBlock>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
