import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { nanoid } from 'nanoid';
import { MessageSquareTextIcon, MinusIcon, PlusIcon, WandSparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { AGENT_KIND_META, AGENT_KINDS, type AgentKind } from '~/agents/agent_kinds';
import {
  CREATOR_OPTION_FIELDS,
  resolveCreatorOptions,
  type CreatorOptions
} from '~/agents/creator_options';
import type { AgentModelId } from '~/agents/models';
import { GAME_GUIDES } from '~/agents/prompts/games';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Button } from '~/components/ui/button';
import { GAME_KINDS, type GameKind } from '~/util/catalog/tags';
import { cn } from '~/lib/utils';
import { AGENT_SUGGESTIONS } from './agent_meta';
import { ChatComposer } from './chat/ChatComposer';
import { ModelPicker } from './chat/ModelPicker';
import { setPendingMessage } from './pending_message';
import { MobileHistoryButton } from './sidebar/AgentsSidebar';

const AGENT_ICONS = { general: MessageSquareTextIcon, puzzle_creator: WandSparklesIcon } as const;

/** Pick an agent (and a game for the creator) and a model, then send the first message. */
export function NewChatPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [agentKind, setAgentKind] = useState<AgentKind>('general');
  const [gameKind, setGameKind] = useState<GameKind | null>(null);
  const [optionOverrides, setOptionOverrides] = useState<Partial<CreatorOptions>>({});
  const [pickedModel, setPickedModel] = useState<AgentModelId | null>(null);
  const model = pickedModel ?? AGENT_KIND_META[agentKind].defaultModel;
  const needsGame = agentKind === 'puzzle_creator' && gameKind === null;
  const creatorOptions = gameKind ? resolveCreatorOptions(gameKind, optionOverrides) : null;

  const pickGame = (kind: GameKind) => {
    setGameKind(kind);
    setOptionOverrides({});
  };

  const create_mut = useMutation(
    trpc.agents.create_chat.mutationOptions({
      onSuccess: (chat) => {
        void queryClient.invalidateQueries({ queryKey: trpc.agents.list_chats.queryKey() });
        void navigate({ to: '/admin/agents/$chatId', params: { chatId: chat.id } });
      },
      onError: (error) => toast.error(error.message)
    })
  );

  const start = (text: string) => {
    if (needsGame) {
      toast.error('Pick a game for the Puzzle Creator first');
      return;
    }
    const id = nanoid(16);
    setPendingMessage(id, text);
    create_mut.mutate({
      id,
      agent_kind: agentKind,
      game_kind: agentKind === 'puzzle_creator' ? gameKind : null,
      model,
      creator_options: creatorOptions ?? undefined
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 px-3 py-2 md:hidden">
        <MobileHistoryButton />
        <span className="text-sm font-semibold">New chat</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:py-14">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-2xl font-black tracking-tight">Agents</h1>
            <p className="text-sm text-muted-foreground">Internal AI helpers for running Krīḍā.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Agent">
            {AGENT_KINDS.map((kind) => {
              const Icon = AGENT_ICONS[kind];
              const selected = agentKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setAgentKind(kind);
                    setPickedModel(null);
                  }}
                  className={cn(
                    'flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                      : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40'
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon
                      className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')}
                    />
                    {AGENT_KIND_META[kind].label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {AGENT_KIND_META[kind].description}
                  </span>
                </button>
              );
            })}
          </div>

          {agentKind === 'puzzle_creator' ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-foreground uppercase">Game</p>
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Game"
              >
                {GAME_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={gameKind === kind}
                    onClick={() => pickGame(kind)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors',
                      gameKind === kind
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                        : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40'
                    )}
                  >
                    <img src={GAME_APP_ICON_SRC[kind]} alt="" className="size-6 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {GAME_GUIDES[kind].name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {GAME_GUIDES[kind].summary}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {gameKind && creatorOptions ? (
                <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {CREATOR_OPTION_FIELDS[gameKind].fields.map((field) => {
                      const value = creatorOptions[field.key] ?? field.min;
                      const setValue = (next: number) => {
                        const clamped = Math.min(field.max, Math.max(field.min, Math.round(next)));
                        setOptionOverrides((prev) => ({ ...prev, [field.key]: clamped }));
                      };
                      return (
                        <div
                          key={field.key}
                          className="flex items-center gap-1 rounded-lg border border-border/70 bg-background py-1 pr-1 pl-2.5"
                        >
                          <span className="text-xs font-medium text-foreground">{field.label}</span>
                          <span className="flex items-center gap-0.5">
                            <button
                              type="button"
                              aria-label={`Decrease ${field.label}`}
                              disabled={value <= field.min}
                              onClick={() => setValue(value - 1)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                            >
                              <MinusIcon className="size-3.5" />
                            </button>
                            <span
                              aria-live="polite"
                              className="min-w-6 text-center text-sm font-semibold tabular-nums"
                            >
                              {value}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${field.label}`}
                              disabled={value >= field.max}
                              onClick={() => setValue(value + 1)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                            >
                              <PlusIcon className="size-3.5" />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Starting point — the agent follows these unless you ask for something else in
                    chat.
                    {gameKind === 'padajala'
                      ? ' The grid itself is laid out later in the editor.'
                      : null}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <ChatComposer
            busy={create_mut.isPending}
            onSend={start}
            placeholder={
              agentKind === 'puzzle_creator'
                ? gameKind
                  ? `What ${GAME_GUIDES[gameKind].name} puzzle should we make?`
                  : 'Pick a game above, then describe the puzzle…'
                : 'Ask about puzzles, plays, tags…'
            }
            toolbar={<ModelPicker value={model} onChange={setPickedModel} />}
            autoFocus
          />

          <div className="flex flex-wrap justify-center gap-2">
            {AGENT_SUGGESTIONS[agentKind].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                disabled={create_mut.isPending || needsGame}
                className="h-auto rounded-full py-1.5 whitespace-normal"
                onClick={() => start(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
