'use client';

import { useEffect, useMemo } from 'react';
import { IoMdAdd, IoMdClose } from 'react-icons/io';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useHistoryTextField } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import type { PadavaliWordCandidate } from '~/util/puzzle/word_list';
import { isWordAdded } from '~/util/puzzle/word_list';
import { countDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';

const BASE_SCRIPT = 'Devanagari';

type IndexedWordCandidate = {
  entry: PadavaliWordCandidate;
  originalIndex: number;
};

type WordCandidateRowProps = {
  candidate: IndexedWordCandidate;
  typingContext: ReturnType<typeof createTypingContext>;
  lipiLekhikaActive: boolean;
  showSelection: boolean;
  showSyllableCount: boolean;
  onRemove: (index: number) => void;
  onUpdateWord: (index: number, value: string) => void;
  onToggleAdded: (index: number, added: boolean) => void;
};

function WordCandidateRow({
  candidate: { entry, originalIndex },
  typingContext,
  lipiLekhikaActive,
  showSelection,
  showSyllableCount,
  onRemove,
  onUpdateWord,
  onToggleAdded
}: WordCandidateRowProps) {
  const historyField = useHistoryTextField();
  const syllableCount = countDevanagariAksharas(entry.word);
  const isAdded = isWordAdded(entry);

  return (
    <div className={cn('flex min-w-0 items-center gap-2', !isAdded && 'opacity-60')}>
      {showSelection ? (
        <Checkbox
          checked={isAdded}
          onCheckedChange={(checked) => onToggleAdded(originalIndex, checked === true)}
          aria-label={isAdded ? 'Exclude word from puzzle' : 'Include word in puzzle'}
        />
      ) : null}
      <Input
        type="text"
        className="min-w-0 flex-1 text-base"
        value={entry.word}
        onChange={(event) => onUpdateWord(originalIndex, event.currentTarget.value)}
        onBeforeInput={(event) =>
          handleTypingBeforeInputEvent(
            typingContext,
            event,
            (newValue) => onUpdateWord(originalIndex, newValue),
            lipiLekhikaActive
          )
        }
        onFocus={historyField.onFocus}
        onBlur={() => {
          typingContext.clearContext();
          historyField.onBlur();
        }}
        onKeyDown={(event) => clearTypingContextOnKeyDown(event, typingContext)}
        aria-label={`Word ${originalIndex + 1}`}
      />
      {showSyllableCount ? (
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {syllableCount}
        </Badge>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(originalIndex)}
        aria-label={`Remove word ${originalIndex + 1}`}
      >
        <IoMdClose data-icon="inline-start" />
      </Button>
    </div>
  );
}

type WordCandidateListProps = Omit<WordCandidateRowProps, 'candidate'> & {
  candidates: readonly IndexedWordCandidate[];
  layout: 'grid' | 'list';
};

function WordCandidateList({
  candidates,
  layout,
  typingContext,
  lipiLekhikaActive,
  showSelection,
  showSyllableCount,
  onRemove,
  onUpdateWord,
  onToggleAdded
}: WordCandidateListProps) {
  return (
    <div
      className={cn(
        'max-h-80 overflow-y-auto overscroll-contain pr-1',
        layout === 'grid'
          ? 'grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
          : 'grid max-w-7xl grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'
      )}
    >
      {candidates.map((candidate) => (
        <WordCandidateRow
          key={candidate.originalIndex}
          candidate={candidate}
          typingContext={typingContext}
          lipiLekhikaActive={lipiLekhikaActive}
          showSelection={showSelection}
          showSyllableCount={showSyllableCount}
          onRemove={onRemove}
          onUpdateWord={onUpdateWord}
          onToggleAdded={onToggleAdded}
        />
      ))}
    </div>
  );
}

type SyllableSummaryProps = {
  wordList: readonly PadavaliWordCandidate[];
  gridDimensions: [number, number];
};

function SyllableSummary({ wordList, gridDimensions }: SyllableSummaryProps) {
  const [rows, columns] = gridDimensions;
  const capacity = rows * columns;
  const addedSyllables = wordList.reduce(
    (total, entry) =>
      isWordAdded(entry) && entry.word.trim().length > 0
        ? total + countDevanagariAksharas(entry.word)
        : total,
    0
  );
  const remaining = capacity - addedSyllables;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant={remaining < 0 ? 'destructive' : 'secondary'} className="tabular-nums">
        Added syllables: {addedSyllables} / {capacity}
      </Badge>
      <span className="tabular-nums">
        {remaining < 0 ? `${Math.abs(remaining)} over capacity` : `${remaining} remaining`}
      </span>
    </div>
  );
}

export type PadavaliWordListEditorProps = {
  wordList: readonly PadavaliWordCandidate[];
  gridDimensions: [number, number];
  lipiLekhikaActive: boolean;
  onAddWord: () => void;
  onRemoveWord: (index: number) => void;
  onUpdateWord: (index: number, value: string) => void;
  onToggleAdded: (index: number, added: boolean) => void;
};

export function PadavaliWordListEditor({
  wordList,
  gridDimensions,
  lipiLekhikaActive,
  onAddWord,
  onRemoveWord,
  onUpdateWord,
  onToggleAdded
}: PadavaliWordListEditorProps) {
  const typingContext = useMemo(() => createTypingContext(BASE_SCRIPT), []);
  const fullCandidates = useMemo(
    () => wordList.map((entry, originalIndex) => ({ entry, originalIndex })),
    [wordList]
  );
  const addedCandidates = useMemo(
    () => fullCandidates.filter(({ entry }) => isWordAdded(entry)),
    [fullCandidates]
  );

  useEffect(() => {
    void typingContext.ready;
  }, [typingContext]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Word List</h2>
      <Tabs defaultValue="added" className="gap-3">
        <TabsList className="w-full">
          <TabsTrigger value="added" className="flex-1">
            Added Words
          </TabsTrigger>
          <TabsTrigger value="full" className="flex-1">
            Full List
          </TabsTrigger>
        </TabsList>
        <TabsContent value="added">
          <div className="flex flex-col gap-3">
            <WordCandidateList
              candidates={addedCandidates}
              layout="grid"
              typingContext={typingContext}
              lipiLekhikaActive={lipiLekhikaActive}
              showSelection={false}
              showSyllableCount={false}
              onRemove={onRemoveWord}
              onUpdateWord={onUpdateWord}
              onToggleAdded={onToggleAdded}
            />
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onAddWord}>
              <IoMdAdd data-icon="inline-start" />
              Add Word Slot
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="full">
          <div className="flex flex-col gap-3">
            <SyllableSummary wordList={wordList} gridDimensions={gridDimensions} />
            <WordCandidateList
              candidates={fullCandidates}
              layout="list"
              typingContext={typingContext}
              lipiLekhikaActive={lipiLekhikaActive}
              showSelection
              showSyllableCount
              onRemove={onRemoveWord}
              onUpdateWord={onUpdateWord}
              onToggleAdded={onToggleAdded}
            />
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onAddWord}>
              <IoMdAdd data-icon="inline-start" />
              Add Word Slot
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
