import { isToolUIPart } from 'ai';
import { BotIcon } from 'lucide-react';
import type { AgentUIMessage } from '~/agents/ui_message';
import { Bubble, BubbleContent } from '~/components/ui/bubble';
import { Message, MessageContent } from '~/components/ui/message';
import { Trace, TraceIcon, TraceLine, TraceTitle } from '~/components/ui/trace';
import { PuzzleProposalCard } from '../puzzle/PuzzleProposalCard';
import { ReasoningStep } from '../tools/ReasoningStep';
import { SqlQueryStep } from '../tools/SqlQueryStep';
import { WebSearchStep } from '../tools/WebSearchStep';
import { AgentMarkdown } from './AgentMarkdown';
import { groupParts, messageText, type StepPart } from './message_parts';

function StepRow({ part, streaming }: { part: StepPart; streaming: boolean }) {
  switch (part.type) {
    case 'reasoning':
      return <ReasoningStep text={part.text} running={streaming && part.state === 'streaming'} />;
    case 'tool-sql_query':
      return <SqlQueryStep part={part} streaming={streaming} />;
    case 'tool-web_search':
      return <WebSearchStep part={part} streaming={streaming} />;
  }
}

export function ThinkingLine() {
  return (
    <TraceLine status="running">
      <TraceIcon>
        <BotIcon />
      </TraceIcon>
      <TraceTitle>Working</TraceTitle>
    </TraceLine>
  );
}

export function UserMessage({ message }: { message: AgentUIMessage }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="muted">
          <BubbleContent className="whitespace-pre-wrap">{messageText(message)}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

/** One agent turn: step traces, replies and puzzle proposals, in the order they happened. */
export function AssistantMessage({
  message,
  streaming
}: {
  message: AgentUIMessage;
  streaming: boolean;
}) {
  const groups = groupParts(message.parts);
  // Between steps (a tool finished, the next step has not streamed yet) show that work continues.
  const lastPart = message.parts.filter((part) => part.type !== 'step-start').at(-1);
  const waiting =
    streaming &&
    (!lastPart ||
      (isToolUIPart(lastPart) &&
        (lastPart.state === 'output-available' || lastPart.state === 'output-error')) ||
      (lastPart.type === 'reasoning' && lastPart.state === 'done'));

  return (
    <Message>
      <MessageContent className="w-full gap-3">
        {groups.map((group, index) => {
          const isLast = index === groups.length - 1;
          switch (group.kind) {
            case 'steps':
              return (
                <Trace key={group.key}>
                  {group.parts.map((part, partIndex) => (
                    <StepRow key={partIndex} part={part} streaming={streaming} />
                  ))}
                </Trace>
              );
            case 'text':
              return (
                <AgentMarkdown key={group.key} streaming={streaming && isLast}>
                  {group.text}
                </AgentMarkdown>
              );
            case 'proposal':
              return <PuzzleProposalCard key={group.key} part={group.part} streaming={streaming} />;
          }
        })}
        {waiting ? <ThinkingLine /> : null}
      </MessageContent>
    </Message>
  );
}
