import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTRPC } from '~/api/client';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { AgentChat } from './chat/AgentChat';

export function ChatPage({ chatId }: { chatId: string }) {
  const trpc = useTRPC();
  const chat_q = useQuery(
    trpc.agents.get_chat.queryOptions(
      { id: chatId },
      // useChat owns the messages once mounted; refetches only refresh chat metadata.
      // While a reply streams in the background, poll so it appears when it lands.
      {
        refetchOnWindowFocus: false,
        retry: false,
        refetchInterval: (query) => (query.state.data?.chat.streaming ? 2500 : false)
      }
    )
  );

  if (chat_q.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (chat_q.isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">{chat_q.error.message}</p>
        <Button
          render={<Link to="/admin/agents" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          Start a new chat
        </Button>
      </div>
    );
  }

  return <AgentChat key={chatId} data={chat_q.data} />;
}
