import { CheckIcon } from 'lucide-react';
import type { KindedPuzzleDraft, PuzzleDraftByKind } from '~/agents/drafts/schemas';
import { normalizePadajalaAnswer } from '~/agents/drafts/to_game_data';
import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import { cn } from '~/lib/utils';

const sectionLabel = 'text-[11px] font-semibold tracking-wider text-muted-foreground uppercase';

function AksharaTiles({ word, className }: { word: string; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap gap-0.5', className)}>
      {splitDevanagariAksharas(word).map((akshara, index) => (
        <span
          key={index}
          className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-sm leading-none"
        >
          {akshara}
        </span>
      ))}
    </span>
  );
}

function GridNote({ size }: { size?: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      {size ? `Saved with an empty ${size} grid. ` : ''}
      Lay out the grid in the editor after adding (use the layout generator).
    </p>
  );
}

function PadavaliPreview({ draft }: { draft: PuzzleDraftByKind['padavali'] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={sectionLabel}>Words · {draft.words.length}</p>
      <div className="flex flex-wrap gap-1.5">
        {draft.words.map((word, index) => (
          <span
            key={index}
            className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1 text-base"
          >
            {word}
          </span>
        ))}
      </div>
      <GridNote size={`${draft.grid_rows}×${draft.grid_cols}`} />
    </div>
  );
}

function PadajalaPreview({ draft }: { draft: PuzzleDraftByKind['padajala'] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={sectionLabel}>Entries · {draft.words.length}</p>
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-2.5 py-1.5 text-left font-medium">Answer</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Word</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Clue</th>
            </tr>
          </thead>
          <tbody>
            {draft.words.map((entry, index) => (
              <tr key={index} className="border-t border-border/50 align-top">
                <td className="px-2.5 py-1.5 font-mono text-xs font-semibold tracking-wider">
                  {normalizePadajalaAnswer(entry.answer)}
                </td>
                <td className="px-2.5 py-1.5 whitespace-nowrap">{entry.word_dev}</td>
                <td className="px-2.5 py-1.5 text-muted-foreground">{entry.clue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <GridNote />
    </div>
  );
}

function DvayiPreview({ draft }: { draft: PuzzleDraftByKind['dvayi'] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={sectionLabel}>Pairs · {draft.pairs.length}</p>
      <ul className="grid gap-1.5">
        {draft.pairs.map((pair, index) => (
          <li
            key={index}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5 text-sm"
          >
            <span>{pair.left}</span>
            <span className="text-muted-foreground">↔</span>
            <span className="text-right">{pair.right}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BhramitaPreview({ draft }: { draft: PuzzleDraftByKind['bhramita'] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={sectionLabel}>Words · {draft.words.length}</p>
      <ul className="flex flex-col gap-1.5">
        {draft.words.map((word, index) => (
          <li key={index} className="flex flex-wrap items-center gap-3">
            <span className="min-w-24 text-base font-medium">{word}</span>
            <AksharaTiles word={word} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SurupaPreview({ draft }: { draft: PuzzleDraftByKind['surupa'] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={sectionLabel}>Words · {draft.words.length}</p>
      <ul className="flex flex-col gap-3">
        {draft.words.map((entry, index) => (
          <li key={index} className="flex flex-col gap-1.5">
            <span className="text-base font-medium">{entry.word}</span>
            <div className="flex flex-wrap gap-1.5">
              {entry.aksharas.map((part, partIndex) => (
                <div
                  key={partIndex}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border/70 bg-muted/30 px-2 py-1"
                >
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {part.akshara}
                  </span>
                  <span className="text-xs text-muted-foreground line-through decoration-rose-400/70">
                    {part.alternatives.join(' ')}
                  </span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnveshiPreview({ draft }: { draft: PuzzleDraftByKind['anveshi'] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={sectionLabel}>Questions · {draft.questions.length}</p>
      <ol className="flex flex-col gap-2.5">
        {draft.questions.map((question, index) => (
          <li key={index} className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="text-sm font-medium">
              {index + 1}. {question.prompt}
            </p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => {
                const correct = optionIndex === question.correct_option_index;
                return (
                  <li
                    key={optionIndex}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm',
                      correct
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'border-border/60 bg-background'
                    )}
                  >
                    {correct ? <CheckIcon className="size-3.5 shrink-0" /> : null}
                    {option}
                  </li>
                );
              })}
            </ul>
            {question.hint.trim() ? (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">Hint:</span> {question.hint}
              </p>
            ) : null}
            {question.explanation.trim() ? (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">Explanation:</span> {question.explanation}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The game content of a proposal, laid out the way that game reads. */
export function PuzzleDraftPreview({ proposal }: { proposal: KindedPuzzleDraft }) {
  switch (proposal.kind) {
    case 'padavali':
      return <PadavaliPreview draft={proposal.draft} />;
    case 'padajala':
      return <PadajalaPreview draft={proposal.draft} />;
    case 'dvayi':
      return <DvayiPreview draft={proposal.draft} />;
    case 'bhramita':
      return <BhramitaPreview draft={proposal.draft} />;
    case 'surupa':
      return <SurupaPreview draft={proposal.draft} />;
    case 'anveshi':
      return <AnveshiPreview draft={proposal.draft} />;
  }
}
