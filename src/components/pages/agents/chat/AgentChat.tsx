import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import { DefaultChatTransport, isToolUIPart } from 'ai';
import { AlertCircleIcon, LibraryBigIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react';
import { useTRPC } from '~/api/client';
import type { AppRouter } from '~/api/trpc_router';
import { AGENT_KIND_META } from '~/agents/agent_kinds';
import { describeCreatorOptions, resolveCreatorOptions } from '~/agents/creator_options';
import type { AgentModelId } from '~/agents/models';
import { GAME_GUIDES } from '~/agents/prompts/games';
import type { AgentUIMessage } from '~/agents/ui_message';

/** A composed message as UI parts: mentioned puzzles first, then the text. */
const toUserParts = ({ text, refs }: ComposerMessage): AgentUIMessage['parts'] => [
  ...refs.map((data) => ({ type: 'data-puzzle_ref' as const, data })),
  { type: 'text', text }
];
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Button } from '~/components/ui/button';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '~/components/ui/message-scroller';
import { AGENT_SUGGESTIONS } from '../agent_meta';
import { ContextDialog } from '../context/ContextDialog';
import { takePendingMessage } from '../pending_message';
import { MobileHistoryButton } from '../sidebar/AgentsSidebar';
import { AgentChatProvider, type AddedPuzzle } from './agent_chat_context';
import { AssistantMessage, ThinkingLine, UserMessage } from './AgentMessage';
import { ChatComposer, type ComposerMessage } from './ChatComposer';
import { ChatCost } from './ChatCost';
import { ModelPicker } from './ModelPicker';
import { QueuedMessages } from './QueuedMessages';
import { useMessageQueue } from './use_message_queue';

export type AgentChatData = inferRouterOutputs<AppRouter>['agents']['get_chat'];

/** A tool call still waiting on client-side input: the run may continue by itself. */
function hasPendingToolInput(messages: AgentUIMessage[]) {
  const last = [...messages].reverse().find((message) => message.role === 'assistant');
  return last?.parts.some(
    (part) =>
      isToolUIPart(part) && (part.state === 'input-streaming' || part.state === 'input-available')
  );
}

export function AgentChat({ data }: { data: AgentChatData }) {
  const { chat } = data;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [model, setModel] = useState<AgentModelId>(chat.model);
  const [contextOpen, setContextOpen] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AgentUIMessage>({
        api: '/api/agents/chat',
        // Only the new message (plus the per-request model): history is loaded server-side.
        prepareSendMessagesRequest: ({ id, messages, body }) => ({
          body: { ...body, id, message: messages.at(-1) }
        })
      }),
    []
  );

  const refreshSidebar = () =>
    void queryClient.invalidateQueries({ queryKey: trpc.agents.list_chats.queryKey() });

  // Tells the streaming reply to abort server-side too: without it the reply keeps
  // generating in the background after the tab lets go. Fire and forget.
  const { mutate: requestServerStopMutation } = useMutation(
    trpc.agents.stop_reply.mutationOptions()
  );
  const requestServerStop = useCallback(() => {
    requestServerStopMutation({ id: chat.id });
  }, [requestServerStopMutation, chat.id]);

  const { messages, sendMessage, setMessages, status, stop, error, regenerate } =
    useChat<AgentUIMessage>({
      id: chat.id,
      messages: data.messages,
      transport,
      onFinish: () => {
        refreshSidebar();
        // Title + streaming flag land with the save; pick up the fresh chat state.
        void queryClient.invalidateQueries({
          queryKey: trpc.agents.get_chat.queryKey({ id: chat.id })
        });
        // The title is saved as the stream closes; pick it up a moment later too.
        setTimeout(refreshSidebar, 1_500);
      }
    });

  useEffect(() => {
    const pending = takePendingMessage(chat.id);
    if (pending) {
      void sendMessage({ parts: toUserParts(pending) }, { body: { model: chat.model } });
    }
  }, [chat.id, chat.model, sendMessage]);

  const busy = status === 'submitted' || status === 'streaming';

  // Drafts typed while a reply streams. Per chat (this view remounts per chat id) and
  // in-memory only — the queue hook clears it on unmount.
  const messaging = useMessageQueue();
  const [editTicket, setEditTicket] = useState<{ message: ComposerMessage; nonce: number } | null>(
    null
  );
  // Set when the user stops the run: the queue stays put for them to decide.
  const stoppedManually = useRef(false);
  // This view sent at least once: background-stream adoption below must not clobber it.
  const sentLocally = useRef(false);

  const sendNow = useCallback(
    (message: ComposerMessage) => {
      sentLocally.current = true;
      stoppedManually.current = false;
      void sendMessage({ parts: toUserParts(message) }, { body: { model } });
    },
    [sendMessage, model]
  );

  const send = (message: ComposerMessage) => {
    // While a reply streams the composer stays usable: Enter queues instead of interrupting.
    if (busy) messaging.enqueue(message);
    else sendNow(message);
  };

  const handleStop = () => {
    stoppedManually.current = true;
    requestServerStop();
    stop();
  };

  const sendQueuedNow = (id: string) => {
    const item = messaging.take(id);
    if (!item) return;
    // Interrupt the run for this one; the rest of the queue still auto-sends afterwards.
    if (busy) {
      stoppedManually.current = true;
      requestServerStop();
      stop();
    }
    sendNow({ text: item.text, refs: item.refs });
  };

  const editQueued = (id: string) => {
    const item = messaging.take(id);
    if (!item) return;
    setEditTicket((ticket) => ({
      message: { text: item.text, refs: item.refs },
      nonce: (ticket?.nonce ?? 0) + 1
    }));
  };

  // A run that finished normally (no error, not stopped, no tool continuation pending)
  // picks up the first queued draft. After an error or Stop the queue stays for the user.
  const prevStatus = useRef(status);
  useEffect(() => {
    const wasBusy = prevStatus.current === 'submitted' || prevStatus.current === 'streaming';
    prevStatus.current = status;
    if (!wasBusy || status !== 'ready' || error || stoppedManually.current) return;
    if (hasPendingToolInput(messages)) return;
    const next = messaging.takeFirst();
    if (next) sendNow({ text: next.text, refs: next.refs });
  }, [status, error, messages, messaging, sendNow]);

  // A reply generated elsewhere (background stream, another tab) lands in the DB while this
  // view is idle: adopt it so refresh / back-navigation shows the finished turn. Never while
  // this view sent or streams itself — the local conversation wins.
  useEffect(() => {
    if (
      !busy &&
      !sentLocally.current &&
      !data.chat.streaming &&
      data.messages.length > messages.length
    ) {
      setMessages(data.messages);
    }
  }, [busy, data.chat.streaming, data.messages, messages.length, setMessages]);

  // Warn before dropping an in-flight reply with a reload or tab close.
  useEffect(() => {
    if (!busy) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [busy]);
  const added = useMemo(
    () => new Map<string, AddedPuzzle>(data.added_puzzles.map((row) => [row.tool_call_id, row])),
    [data.added_puzzles]
  );
  const isCreator = chat.agent_kind === 'puzzle_creator';
  const game = chat.game_kind ? GAME_GUIDES[chat.game_kind] : null;
  const lastMessage = messages.at(-1);
  const creatorSummary =
    isCreator && chat.game_kind
      ? describeCreatorOptions(
          chat.game_kind,
          resolveCreatorOptions(chat.game_kind, chat.creator_options)
        ).join(' · ')
      : null;

  return (
    <AgentChatProvider value={{ chatId: chat.id, gameKind: chat.game_kind, added }}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
          <MobileHistoryButton />
          {chat.game_kind ? (
            <img src={GAME_APP_ICON_SRC[chat.game_kind]} alt="" className="size-5 shrink-0" />
          ) : (
            <SparklesIcon className="size-4 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {chat.title || 'New chat'}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {AGENT_KIND_META[chat.agent_kind].label}
              {game ? ` · ${game.name}` : ''}
              {creatorSummary ? ` · ${creatorSummary}` : ''}
            </p>
          </div>
          <ChatCost messages={messages} />
          <Button variant="outline" size="sm" onClick={() => setContextOpen(true)}>
            <LibraryBigIcon />
            Context
          </Button>
        </header>
        {!busy && chat.streaming ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 border-b border-border/70 px-3 py-1.5 text-xs text-muted-foreground"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Replying in the background — it will appear here when it lands.
          </p>
        ) : null}

        <div className="relative min-h-0 flex-1">
          {messages.length === 0 && !busy ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-5 px-4 text-center">
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold">{AGENT_KIND_META[chat.agent_kind].label}</p>
                <p className="text-sm text-muted-foreground">
                  {AGENT_KIND_META[chat.agent_kind].description}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {AGENT_SUGGESTIONS[chat.agent_kind].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="h-auto rounded-full py-1.5 whitespace-normal"
                    onClick={() => send({ text: suggestion, refs: [] })}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <MessageScrollerProvider autoScroll>
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={busy}
                    className="mx-auto w-full max-w-3xl gap-6 px-4 py-6"
                  >
                    {messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === 'user'}
                      >
                        {message.role === 'user' ? (
                          <UserMessage message={message} />
                        ) : (
                          <AssistantMessage
                            message={message}
                            streaming={busy && message === lastMessage}
                          />
                        )}
                      </MessageScrollerItem>
                    ))}
                    {status === 'submitted' && lastMessage?.role === 'user' ? (
                      <MessageScrollerItem messageId="pending">
                        <ThinkingLine />
                      </MessageScrollerItem>
                    ) : null}
                    {error && !busy ? (
                      <MessageScrollerItem messageId="error">
                        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <p className="break-words">
                              {error.message || 'The agent failed to reply.'}
                            </p>
                            <Button
                              size="xs"
                              variant="outline"
                              className="self-start"
                              onClick={() => void regenerate({ body: { model } })}
                            >
                              <RotateCcwIcon />
                              Retry
                            </Button>
                          </div>
                        </div>
                      </MessageScrollerItem>
                    ) : null}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <QueuedMessages
            queue={messaging.queue}
            onEdit={editQueued}
            onSendNow={sendQueuedNow}
            onRemove={messaging.remove}
          />
          <ChatComposer
            busy={busy}
            onStop={handleStop}
            onSend={send}
            placeholder={
              isCreator && game
                ? `Ask for a ${game.name} puzzle…`
                : 'Ask about puzzles, plays, tags…'
            }
            toolbar={<ModelPicker value={model} onChange={setModel} disabled={busy} />}
            mentionGame={chat.game_kind}
            editTicket={editTicket}
            autoFocus
          />
        </div>
      </div>

      <ContextDialog
        chatId={chat.id}
        open={contextOpen}
        onOpenChange={setContextOpen}
        canRefresh={isCreator}
      />
    </AgentChatProvider>
  );
}
