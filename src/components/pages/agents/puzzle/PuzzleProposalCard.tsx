import { useState } from 'react';
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ExternalLinkIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon
} from 'lucide-react';
import { parsePuzzleDraft, type KindedPuzzleDraft } from '~/agents/drafts/schemas';
import { GAME_GUIDES } from '~/agents/prompts/games';
import type { ProposePuzzleOutput } from '~/agents/ui_message';
import { GAME_APP_ICON_SRC } from '~/components/GameAppIcon';
import { Button } from '~/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle
} from '~/components/ui/trace';
import { cn } from '~/lib/utils';
import { puzzleEditorHref, useAgentChat, type AddedPuzzle } from '../chat/agent_chat_context';
import type { AgentToolPart } from '../chat/message_parts';
import { AddPuzzleDialog } from './AddPuzzleDialog';
import { IssueList, ProposalMeta } from './ProposalMeta';
import { PuzzleDraftPreview } from './PuzzleDraftPreview';

type ProposalPart = AgentToolPart<'propose_puzzle'>;

/** Still streaming the draft, or waiting for the checks. */
function ProposalPending({ part, streaming }: { part: ProposalPart; streaming: boolean }) {
  const title = part.input?.title;
  const label = !streaming
    ? 'Proposal interrupted'
    : part.state === 'input-streaming'
      ? 'Drafting a puzzle'
      : 'Checking the puzzle';
  return (
    <TraceLine status={streaming ? 'running' : 'error'}>
      <TraceIcon>
        <SparklesIcon />
      </TraceIcon>
      <TraceTitle>{label}</TraceTitle>
      {title ? <TraceDescription>{title}</TraceDescription> : null}
    </TraceLine>
  );
}

/** A draft that failed the checks; the agent revises it, so it stays a quiet row. */
function ProposalNeedsFixes({ title, errors }: { title?: string; errors: string[] }) {
  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine>
          <TraceIcon>
            <RefreshCwIcon />
          </TraceIcon>
          <TraceTitle>Draft needed fixes</TraceTitle>
          <TraceDescription>
            {title ? `${title} · ` : ''}
            {errors.length} issue{errors.length === 1 ? '' : 's'}
          </TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <IssueList items={errors} tone="error" />
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

function AddedStatus({ added }: { added: AddedPuzzle }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2Icon className="size-3.5" />
        Added
      </span>
      {added.puzzle_id && added.kind ? (
        <a
          href={puzzleEditorHref(added.kind, added.puzzle_id)}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open in editor
          <ExternalLinkIcon className="size-3" />
        </a>
      ) : (
        <span className="text-[11px] text-muted-foreground">Puzzle deleted</span>
      )}
    </div>
  );
}

/** A passing draft: title and description, expanding to the full content, with Add. */
function ProposalCard({
  toolCallId,
  proposal,
  check
}: {
  toolCallId: string;
  proposal: KindedPuzzleDraft;
  check: ProposePuzzleOutput;
}) {
  const { added } = useAgentChat();
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const addedPuzzle = added.get(toolCallId);
  const { draft, kind } = proposal;

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm transition-colors',
        addedPuzzle
          ? 'border-emerald-300/80 dark:border-emerald-800/80'
          : 'border-border/80 hover:border-border'
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        <img
          src={GAME_APP_ICON_SRC[kind]}
          alt={GAME_GUIDES[kind].name}
          className="mt-0.5 size-6 shrink-0"
        />
        <CollapsibleTrigger className="group/proposal flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left outline-none">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold text-foreground">
              {draft.title}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded/proposal:rotate-180" />
          </span>
          {draft.description ? (
            <span className="line-clamp-2 text-xs text-muted-foreground">{draft.description}</span>
          ) : null}
          <ProposalMeta tags={check.tags} collections={check.collections} className="mt-1" />
        </CollapsibleTrigger>
        <div className="shrink-0">
          {addedPuzzle ? (
            <AddedStatus added={addedPuzzle} />
          ) : (
            <Button size="sm" onClick={() => setAdding(true)}>
              <PlusIcon />
              Add puzzle
            </Button>
          )}
        </div>
      </div>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 data-ending-style:h-0 data-starting-style:h-0">
        <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/10 p-3.5">
          <IssueList items={check.warnings} tone="warning" />
          <PuzzleDraftPreview proposal={proposal} />
          <p className="text-[11px] text-muted-foreground">
            Slug <span className="font-mono">{check.slug}</span>
          </p>
        </div>
      </CollapsibleContent>
      {adding ? (
        <AddPuzzleDialog
          open={adding}
          onOpenChange={setAdding}
          toolCallId={toolCallId}
          proposal={proposal}
          initialCheck={check}
        />
      ) : null}
    </Collapsible>
  );
}

/** A `propose_puzzle` call, rendered for whichever state it is in. */
export function PuzzleProposalCard({
  part,
  streaming
}: {
  part: ProposalPart;
  streaming: boolean;
}) {
  const { gameKind } = useAgentChat();

  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <ProposalPending part={part} streaming={streaming} />;
  }
  if (part.state === 'output-error') {
    return <ProposalNeedsFixes title={part.input?.title} errors={[part.errorText]} />;
  }
  if (part.state !== 'output-available') return null;
  if (!part.output.ok) {
    return <ProposalNeedsFixes title={part.input.title} errors={part.output.errors} />;
  }

  const proposal = gameKind ? parsePuzzleDraft(gameKind, part.input) : null;
  if (!proposal) return null;
  return <ProposalCard toolCallId={part.toolCallId} proposal={proposal} check={part.output} />;
}
