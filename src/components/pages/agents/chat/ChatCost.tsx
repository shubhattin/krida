import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, InfoIcon } from 'lucide-react';
import { AGENT_MODELS } from '~/agents/models';
import type { AgentMessageMetadata, AgentUIMessage } from '~/agents/ui_message';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';

/** Dollars with enough precision for small amounts: $0.0042, $0.042, $1.23. */
export function formatCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : String(n);

function usageLine(usage: AgentMessageMetadata['usage']): string | null {
  if (!usage) return null;
  const parts = [`${compact(usage.inputTokens ?? 0)} in`];
  if (usage.cachedInputTokens) parts.push(`${compact(usage.cachedInputTokens)} cached`);
  parts.push(`${compact(usage.outputTokens ?? 0)} out`);
  if (usage.reasoningTokens) parts.push(`${compact(usage.reasoningTokens)} reasoning`);
  return parts.join(' · ');
}

/** Under a finished reply: an info button opening the actual cost, its tokens and the model. */
export function ReplyCost({ metadata }: { metadata: AgentMessageMetadata | undefined }) {
  if (metadata?.cost === undefined) return null;
  const tokens = usageLine(metadata.usage);
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Reply cost ${formatCost(metadata.cost)}`}
        className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
      >
        <InfoIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-60 flex-col gap-1 text-xs">
        <span>
          Cost {formatCost(metadata.cost)}
          {metadata.model ? ` · ${AGENT_MODELS[metadata.model]?.label ?? metadata.model}` : null}
        </span>
        {tokens ? <span className="text-muted-foreground tabular-nums">{tokens}</span> : null}
        <span className="text-muted-foreground/70">
          As charged by OpenRouter, cache discounts included.
        </span>
      </PopoverContent>
    </Popover>
  );
}

/** Under a finished reply: a copy button for the reply's markdown, beside the cost info. */
export function CopyReplyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!text.trim()) return null;
  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : 'Copy reply as markdown'}
      title={copied ? 'Copied' : 'Copy reply as markdown'}
      onClick={() => {
        try {
          const clip = navigator.clipboard;
          if (!clip?.writeText) return;
          void clip
            .writeText(text)
            .then(() => {
              setCopied(true);
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => undefined);
        } catch {
          return;
        }
      }}
      className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}

/** Header badge: an info button opening the chat's total actual cost and token breakdown. */
export function ChatCost({ messages }: { messages: AgentUIMessage[] }) {
  const replies = messages.filter((m) => m.role === 'assistant');
  if (replies.length === 0) return null;
  let total = 0;
  let untracked = 0;
  const usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningTokens: 0 };
  for (const reply of replies) {
    const meta = reply.metadata;
    if (meta?.cost === undefined) {
      untracked++;
      continue;
    }
    total += meta.cost;
    usage.inputTokens += meta.usage?.inputTokens ?? 0;
    usage.outputTokens += meta.usage?.outputTokens ?? 0;
    usage.cachedInputTokens += meta.usage?.cachedInputTokens ?? 0;
    usage.reasoningTokens += meta.usage?.reasoningTokens ?? 0;
  }
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Chat cost details"
        className="inline-flex items-center justify-center rounded-md border border-border/70 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <InfoIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-64 flex-col gap-1 text-xs">
        <span>
          Actual cost of this chat: {formatCost(total)} over {replies.length - untracked} replies
        </span>
        <span className="text-muted-foreground tabular-nums">{usageLine(usage)}</span>
        {untracked > 0 ? (
          <span className="text-muted-foreground">
            {untracked} older {untracked === 1 ? 'reply has' : 'replies have'} no cost recorded.
          </span>
        ) : null}
        <span className="text-muted-foreground/70">
          As charged by OpenRouter, cache discounts included; chat titles not counted.
        </span>
      </PopoverContent>
    </Popover>
  );
}
