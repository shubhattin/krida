'use client';

import { useState } from 'react';
import { useAtom, type PrimitiveAtom } from 'jotai';
import { Plus, SpellCheck, Trash2, X } from 'lucide-react';
import { LipiLekhikaSwitch } from '~/components/puzzle/LipiLekhikaSwitch';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { useEditorHistoryActions } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import { createSurupaWord, type SurupaPuzzleData, type SurupaWord } from '~/util/surupa/data';
import { alignSurupaPuzzleData, alignSurupaWord } from '~/util/surupa/infer';
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

function withAlignedAlternatives(
  word: SurupaWord,
  updater: (lists: string[][]) => string[][]
): SurupaWord {
  const aligned = alignSurupaWord(word);
  return { ...aligned, alternatives: updater(aligned.alternatives) };
}

export function SurupaEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<SurupaPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  const [lipi, setLipi] = useAtom(lipiAtom);
  const { commit } = useEditorHistoryActions();
  const bind = useLipiBinder(lipi, setLipi);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const updateWord = (id: string, update: (word: SurupaWord) => SurupaWord) =>
    setData((prev) => ({
      ...prev,
      words: prev.words.map((row) => (row.id === id ? update(row) : row))
    }));

  const addWord = () => {
    const word = createSurupaWord();
    setData((prev) => ({ ...prev, words: [...prev.words, word] }));
    commit();
    focusFieldSoon(`surupa-word-${word.id}`);
  };

  /** Add one or more distractors (comma / space separated) to a syllable column. */
  const addAlternatives = (word: SurupaWord, syllableIndex: number, raw: string) => {
    const key = `${word.id}:${syllableIndex}`;
    const values = raw
      .split(/[\s,]+/u)
      .map((value) => value.trim())
      .filter(Boolean);
    setDrafts((prev) => ({ ...prev, [key]: '' }));
    if (values.length === 0) return;
    updateWord(word.id, (row) =>
      withAlignedAlternatives(row, (lists) =>
        lists.map((list, index) => {
          if (index !== syllableIndex) return list;
          const correct = alignSurupaWord(row).syllables[index];
          const kept = list.filter(Boolean);
          const fresh = values.filter((value) => value !== correct && !kept.includes(value));
          return [...kept, ...fresh];
        })
      )
    );
  };

  const removeAlternative = (word: SurupaWord, syllableIndex: number, altIndex: number) => {
    updateWord(word.id, (row) =>
      withAlignedAlternatives(row, (lists) =>
        lists.map((list, index) =>
          index === syllableIndex ? list.filter((_, i) => i !== altIndex) : list
        )
      )
    );
    commit();
  };

  return (
    <EditorSection
      title="Words"
      count={data.words.length}
      accentClassName="from-violet-500 to-fuchsia-600"
      description="Type the correct word, then add misspelt alternatives under each syllable. Players spin a wheel per syllable."
      actions={
        <>
          <LipiLekhikaSwitch
            checked={lipi}
            onCheckedChange={setLipi}
            label="Lipi Lekhika for words"
          />
          <Button
            size="sm"
            onClick={addWord}
            className="bg-linear-to-r from-violet-500 to-fuchsia-600 text-white"
          >
            <Plus className="size-4" />
            Add word
          </Button>
        </>
      }
    >
      {data.words.length === 0 ? (
        <EditorEmptyState
          icon={<SpellCheck className="size-8" />}
          title="No words yet"
          hint="Add a correctly spelt word; each syllable then gets its own list of tricky alternatives."
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
          className="space-y-3"
        >
          {(word, index) => {
            const aligned = alignSurupaWord(word);
            const missing = aligned.alternatives.filter(
              (list) => list.filter(Boolean).length === 0
            ).length;
            return (
              <SortableRow key={word.id} id={word.id} className="rounded-2xl">
                {(handle) => (
                  <div className="rounded-2xl border border-border/70 bg-background/70">
                    <div className="flex items-center gap-2 border-b border-border/50 p-2">
                      <DragHandle {...handle} />
                      <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <Input
                        data-focus-key={`surupa-word-${word.id}`}
                        placeholder="Correctly spelt word"
                        className="max-w-72 text-lg font-semibold"
                        {...bind(
                          word.word,
                          (value) =>
                            updateWord(word.id, (row) => ({
                              ...row,
                              word: value
                            })),
                          {
                            onBlur: () => setData((prev) => alignSurupaPuzzleData(prev)),
                            onKeyDown: (event) => {
                              if (event.key !== 'Enter') return;
                              event.preventDefault();
                              setData((prev) => alignSurupaPuzzleData(prev));
                              focusFieldSoon(`surupa-alt-${word.id}:0`);
                            }
                          }
                        )}
                      />
                      <span
                        className={cn(
                          'hidden text-xs font-medium sm:inline',
                          missing > 0
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-muted-foreground'
                        )}
                      >
                        {aligned.syllables.length === 0
                          ? ''
                          : missing > 0
                            ? `${missing} syllable${missing === 1 ? '' : 's'} without alternatives`
                            : `${aligned.syllables.length} syllables ready`}
                      </span>
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
                    {aligned.syllables.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground">
                        Syllable columns appear once you type the word.
                      </p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto p-3">
                        {aligned.syllables.map((syllable, syllableIndex) => {
                          const key = `${word.id}:${syllableIndex}`;
                          const alternatives = aligned.alternatives[syllableIndex] ?? [];
                          const empty = alternatives.filter(Boolean).length === 0;
                          return (
                            <div
                              key={syllableIndex}
                              className={cn(
                                'flex w-28 shrink-0 flex-col gap-1.5 rounded-xl border p-1.5',
                                empty
                                  ? 'border-dashed border-amber-400/60 bg-amber-500/5'
                                  : 'border-violet-400/30 bg-violet-500/5'
                              )}
                            >
                              <span className="flex h-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-fuchsia-600 text-xl font-bold text-white shadow-sm">
                                {syllable}
                              </span>
                              {alternatives.map((alt, altIndex) =>
                                alt ? (
                                  <span
                                    key={`${alt}-${altIndex}`}
                                    className="group flex h-8 items-center justify-between rounded-lg border border-border/70 bg-background pr-0.5 pl-2.5 text-base font-semibold"
                                  >
                                    <button
                                      type="button"
                                      title="Edit"
                                      className="min-w-0 flex-1 truncate text-left"
                                      onClick={() => {
                                        removeAlternative(word, syllableIndex, altIndex);
                                        setDrafts((prev) => ({
                                          ...prev,
                                          [key]: alt
                                        }));
                                        focusFieldSoon(`surupa-alt-${key}`);
                                      }}
                                    >
                                      {alt}
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Remove ${alt}`}
                                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                      onClick={() =>
                                        removeAlternative(word, syllableIndex, altIndex)
                                      }
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  </span>
                                ) : null
                              )}
                              <Input
                                data-focus-key={`surupa-alt-${key}`}
                                placeholder="+ add"
                                className="h-8 px-2 text-base"
                                {...bind(
                                  drafts[key] ?? '',
                                  (value) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [key]: value
                                    })),
                                  {
                                    onBlur: () =>
                                      addAlternatives(word, syllableIndex, drafts[key] ?? ''),
                                    onKeyDown: (event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault();
                                        addAlternatives(word, syllableIndex, drafts[key] ?? '');
                                        commit();
                                      } else if (
                                        event.key === 'Backspace' &&
                                        !(drafts[key] ?? '') &&
                                        alternatives.length > 0
                                      ) {
                                        removeAlternative(
                                          word,
                                          syllableIndex,
                                          alternatives.length - 1
                                        );
                                      }
                                    }
                                  }
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
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
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 py-2.5 text-sm text-muted-foreground transition-colors hover:border-violet-400/70 hover:text-foreground"
        >
          <Plus className="size-4" />
          Add word
        </button>
      ) : null}
    </EditorSection>
  );
}
