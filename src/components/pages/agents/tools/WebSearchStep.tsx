import { GlobeIcon } from 'lucide-react';
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle
} from '~/components/ui/trace';
import { AgentMarkdown } from '../chat/AgentMarkdown';
import type { AgentToolPart } from '../chat/message_parts';

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** Collapsed: that a search ran. Expanded: the query, what was found, and the sources. */
export function WebSearchStep({
  part,
  streaming
}: {
  part: AgentToolPart<'web_search'>;
  streaming: boolean;
}) {
  if (part.state === 'output-available' || part.state === 'output-error') {
    const failed = part.state === 'output-error';
    const sources = failed ? [] : part.output.sources;
    return (
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status={failed ? 'error' : undefined}>
            <TraceIcon>
              <GlobeIcon />
            </TraceIcon>
            <TraceTitle>{failed ? 'Web search failed' : 'Searched the web'}</TraceTitle>
            {!failed ? (
              <TraceDescription>
                {sources.length} source{sources.length === 1 ? '' : 's'}
              </TraceDescription>
            ) : null}
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="flex flex-col gap-3">
          {part.input?.query ? (
            <p className="text-xs">
              <span className="text-muted-foreground">Query: </span>
              <span className="font-medium text-foreground">{part.input.query}</span>
            </p>
          ) : null}
          {failed ? (
            <p className="text-xs text-destructive">{part.errorText}</p>
          ) : (
            <>
              <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
                <AgentMarkdown className="text-xs [&_p]:my-1.5">
                  {part.output.summary}
                </AgentMarkdown>
              </div>
              {sources.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {sources.map((source) => (
                    <li key={source.url} className="min-w-0">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group flex min-w-0 items-center gap-2 text-xs no-underline"
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${hostOf(source.url)}&sz=32`}
                          alt=""
                          className="size-3.5 shrink-0 rounded-sm"
                          loading="lazy"
                        />
                        <span className="truncate text-foreground group-hover:underline">
                          {source.title || hostOf(source.url)}
                        </span>
                        <span className="shrink-0 text-muted-foreground/70">
                          {hostOf(source.url)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </TraceCollapsibleContent>
      </TraceCollapsible>
    );
  }

  return (
    <TraceLine status={streaming ? 'running' : 'error'}>
      <TraceIcon>
        <GlobeIcon />
      </TraceIcon>
      <TraceTitle>{streaming ? 'Searching the web' : 'Search interrupted'}</TraceTitle>
    </TraceLine>
  );
}
