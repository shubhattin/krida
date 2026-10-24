import { useState } from 'react';
import { BrainIcon } from 'lucide-react';
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle
} from '~/components/ui/trace';
import { AgentMarkdown } from '../chat/AgentMarkdown';

/** Open while the model thinks, then folds away unless the admin opens it. */
export function ReasoningStep({ text, running }: { text: string; running: boolean }) {
  const [open, setOpen] = useState<boolean>();
  if (!running && text.trim().length === 0) return null;

  return (
    <TraceCollapsible open={open ?? running} onOpenChange={setOpen}>
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? 'running' : undefined}>
          <TraceIcon>
            <BrainIcon />
          </TraceIcon>
          <TraceTitle>{running ? 'Thinking' : 'Thought'}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <AgentMarkdown className="text-xs text-muted-foreground [&_p]:my-1.5" streaming={running}>
          {text}
        </AgentMarkdown>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}
