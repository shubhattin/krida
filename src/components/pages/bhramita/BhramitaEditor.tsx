'use client';

import { useState } from 'react';
import { useAtom, type PrimitiveAtom } from 'jotai';
import { AlertCircle, ListPlus, Plus, Shuffle, Trash2 } from 'lucide-react';
import { LipiLekhikaSwitch } from '~/components/puzzle/LipiLekhikaSwitch';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { useEditorHistoryActions } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import { createBhramitaWord, type BhramitaPuzzleData } from '~/util/bhramita/data';
import { inferBhramitaPuzzleData } from '~/util/bhramita/infer';
import {
  EditorEmptyState,
  EditorSection,
  focusFieldSoon
} from '~/components/pages/simple_game/editor/EditorSection';
import {
  DragHandle,
  SortableList,
  SortableRow
} from '~/components/pages/simple_game/editor/SortableList';
import { useLipiBinder } from '~/components/pages/simple_game/editor/useLipiBinder';

function splitBulk(text: string) {
  return text
    .split(/[\n,;।॥]+/u)
    .map((word) => word.trim())
    .filter(Boolean);
}

export function BhramitaEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<BhramitaPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  const [lipi, setLipi] = useAtom(lipiAtom);
  const { commit } = useEditorHistoryActions();
  const bind = useLipiBinder(lipi, setLipi);
  const inferred = inferBhramitaPuzzleData(data);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState('');
  const bulkWords = splitBulk(bulk);

  const seen = new Map<string, number>();
  for (const entry of inferred.words) {
    const key = entry.word.trim();
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const addWord = () => {
    const word = createBhramitaWord();
    setData((prev) => ({ ...prev, words: [...prev.words, word] }));
    commit();
    focusFieldSoon(`bhramita-${word.id}`);
  };

  const addBulk = () => {
    if (bulkWords.length === 0) return;
    setData((prev) => ({
      ...prev,
      words: [...prev.words, ...bulkWords.map(createBhramitaWord)]
    }));
    commit();
    setBulk('');
    setBulkOpen(false);
  };

  return (
    <EditorSection
      title="Words"
      count={data.words.length}
      accentClassName="from-emerald-500 to-teal-600"
      description="Each word is split into syllables and shuffled for the player. Enter adds the next word."
      actions={
        <>
          <LipiLekhikaSwitch
            checked={lipi}
            onCheckedChange={setLipi}
            label="Lipi Lekhika for words"
          />
          <Button size="sm" variant="outline" onClick={() => setBulkOpen((value) => !value)}>
            <ListPlus className="size-4" />
            Bulk add
          </Button>
          <Button
            size="sm"
            onClick={addWord}
            className="bg-linear-to-r from-emerald-500 to-teal-600 text-white"
          >
            <Plus className="size-4" />
            Add word
          </Button>
        </>
      }
    >
      {bulkOpen ? (
        <div className="mb-4 space-y-2 rounded-xl border border-emerald-400/40 bg-emerald-500/5 p-3">
          <p className="text-xs text-muted-foreground">
            One word per line (commas and दण्ड also split). Lipi Lekhika applies here too.
          </p>
          <Textarea
            rows={4}
            placeholder={'पाणिनिः\nपतञ्जलिः\nकात्यायनः'}
            className="text-base"
            {...bind(bulk, setBulk)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={bulkWords.length === 0} onClick={addBulk}>
              Add {bulkWords.length || ''} word
              {bulkWords.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      ) : null}

      {data.words.length === 0 ? (
        <EditorEmptyState
          icon={<Shuffle className="size-8" />}
          title="No words yet"
          hint="Add words with at least two syllables — they will be jumbled for players."
          action={
            <Button size="sm" variant="outline" onClick={addWord}>
              <Plus className="size-4" />
              Add first word
            </Button>
          }
        />
      ) : (
        <SortableList
          items={data.words}
          onReorder={(words) => {
            setData((prev) => ({ ...prev, words }));
            commit();
          }}
          className="space-y-2"
        >
          {(word, index) => {
            const syllables = inferred.words[index]?.syllables ?? [];
            const trimmed = word.word.trim();
            const problem =
              trimmed.length === 0
                ? null
                : syllables.length < 2
                  ? 'Needs at least two syllables'
                  : (seen.get(trimmed) ?? 0) > 1
                    ? 'Duplicate word'
                    : null;
            return (
              <SortableRow key={word.id} id={word.id} className="rounded-xl">
                {(handle) => (
                  <div
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-xl border bg-background/70 p-2 sm:flex-nowrap',
                      problem ? 'border-amber-400/60' : 'border-border/70'
                    )}
                  >
                    <DragHandle {...handle} />
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground tabular-nums">
                      {index + 1}
                    </span>
                    <Input
                      data-focus-key={`bhramita-${word.id}`}
                      placeholder={`Word ${index + 1}`}
                      className="min-w-40 flex-1 text-base sm:max-w-64"
                      {...bind(
                        word.word,
                        (value) =>
                          setData((prev) => ({
                            ...prev,
                            words: prev.words.map((row) =>
                              row.id === word.id ? { ...row, word: value } : row
                            )
                          })),
                        {
                          onBlur: () => setData((prev) => inferBhramitaPuzzleData(prev)),
                          onKeyDown: (event) => {
                            if (event.key !== 'Enter') return;
                            event.preventDefault();
                            const next = data.words[index + 1];
                            if (next) focusFieldSoon(`bhramita-${next.id}`);
                            else addWord();
                          }
                        }
                      )}
                    />
                    <div className="order-last flex min-w-0 basis-full flex-wrap items-center gap-1 pl-[3.75rem] sm:order-none sm:flex-1 sm:basis-auto sm:pl-0">
                      {syllables.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Syllables appear as you type
                        </span>
                      ) : (
                        syllables.map((syllable, syllableIndex) => (
                          <span
                            key={syllableIndex}
                            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200"
                          >
                            {syllable}
                          </span>
                        ))
                      )}
                      {problem ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                          <AlertCircle className="size-3.5" />
                          {problem}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      title="Delete word"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          words: prev.words.filter((row) => row.id !== word.id)
                        }));
                        commit();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </SortableRow>
            );
          }}
        </SortableList>
      )}
      {data.words.length > 0 ? (
        <button
          type="button"
          onClick={addWord}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 py-2.5 text-sm text-muted-foreground transition-colors hover:border-emerald-400/70 hover:text-foreground"
        >
          <Plus className="size-4" />
          Add word
        </button>
      ) : null}
    </EditorSection>
  );
}
