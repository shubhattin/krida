import { DatabaseIcon } from 'lucide-react';
import { useHighlightedCode } from '~/hooks/use-highlighted-code';
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle
} from '~/components/ui/code-block';
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle
} from '~/components/ui/trace';
import type { SqlCell, SqlQueryOutput } from '~/agents/ui_message';
import type { AgentToolPart } from '../chat/message_parts';

function SqlCode({ query }: { query: string }) {
  const lines = useHighlightedCode(query.trim(), 'sql');
  return (
    <CodeBlock size="sm">
      <CodeBlockHeader>
        <CodeBlockTitle>SQL</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={query.trim()} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent wrap className="max-h-64">
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  );
}

function formatCell(value: SqlCell) {
  if (value === null) return <span className="text-muted-foreground/60">null</span>;
  if (value === true || value === false) return <span className="font-mono">{String(value)}</span>;
  return String(value);
}

function ResultTable({ output }: { output: SqlQueryOutput }) {
  if (output.columns.length === 0) {
    return <p className="text-xs text-muted-foreground">No rows.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="max-h-80 overflow-auto rounded-lg border border-border/70">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-muted/90 backdrop-blur">
            <tr>
              {output.columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-border/70 px-2.5 py-1.5 text-left font-semibold whitespace-nowrap text-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {output.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-background even:bg-muted/30">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="max-w-80 truncate border-b border-border/40 px-2.5 py-1 align-top text-foreground"
                    title={cell === null ? undefined : String(cell)}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {output.row_count} row{output.row_count === 1 ? '' : 's'}
        {output.truncated ? ' (truncated)' : ''} · {output.duration_ms} ms
      </p>
    </div>
  );
}

/** Collapsed: that a query ran and what it was for. Expanded: the SQL and its rows. */
export function SqlQueryStep({
  part,
  streaming
}: {
  part: AgentToolPart<'sql_query'>;
  streaming: boolean;
}) {
  const purpose = part.input?.purpose;

  if (part.state === 'output-available' || part.state === 'output-error') {
    const failed = part.state === 'output-error';
    return (
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine status={failed ? 'error' : undefined}>
            <TraceIcon>
              <DatabaseIcon />
            </TraceIcon>
            <TraceTitle>{failed ? 'Query failed' : 'Queried the database'}</TraceTitle>
            <TraceDescription>
              {[purpose, failed ? null : `${part.output.row_count} rows`]
                .filter(Boolean)
                .join(' · ')}
            </TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent className="flex flex-col gap-2.5">
          {part.input?.query ? <SqlCode query={part.input.query} /> : null}
          {failed ? (
            <p className="text-xs text-destructive">{part.errorText}</p>
          ) : (
            <ResultTable output={part.output} />
          )}
        </TraceCollapsibleContent>
      </TraceCollapsible>
    );
  }

  return (
    <TraceLine status={streaming ? 'running' : 'error'}>
      <TraceIcon>
        <DatabaseIcon />
      </TraceIcon>
      <TraceTitle>{streaming ? 'Querying the database' : 'Query interrupted'}</TraceTitle>
      {purpose ? <TraceDescription>{purpose}</TraceDescription> : null}
    </TraceLine>
  );
}
