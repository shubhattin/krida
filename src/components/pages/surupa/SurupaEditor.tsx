'use client';

import { useMemo } from 'react';
import { useAtom, type PrimitiveAtom } from 'jotai';
import { Plus, Trash2 } from 'lucide-react';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { useEditorHistoryActions, useHistoryTextField } from '~/hooks/useEditorHistory';
import { createSurupaWord, type SurupaPuzzleData } from '~/util/surupa/data';
import { inferSurupaPuzzleData } from '~/util/surupa/infer';

export function SurupaEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<SurupaPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  const [lipi] = useAtom(lipiAtom);
  const { commit } = useEditorHistoryActions();
  const typing = useMemo(() => createTypingContext('Devanagari'), []);
  const field = useHistoryTextField();
  const inferred = inferSurupaPuzzleData(data);

  return (
    <section className="space-y-4 rounded-2xl border border-violet-200/70 bg-linear-to-br from-violet-50/80 via-white to-fuchsia-50/70 p-4 dark:border-violet-900/40 dark:from-violet-950/30 dark:via-slate-950 dark:to-fuchsia-950/20">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Words & syllable alternatives</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setData((prev) => ({ ...prev, words: [...prev.words, createSurupaWord()] }));
            commit();
          }}
        >
          <Plus className="size-4" />
          Add word
        </Button>
      </div>
      {data.words.map((word, index) => {
        const inferredWord = inferred.words[index];
        const syllables = inferredWord?.syllables ?? [];
        const alternatives = inferredWord?.alternatives ?? [];
        return (
          <div
            key={word.id}
            className="space-y-3 rounded-2xl border border-violet-200/60 bg-white/70 p-3 dark:border-violet-900/40 dark:bg-slate-950/50"
          >
            <div className="flex items-center gap-2">
              <Input
                value={word.word}
                {...field}
                placeholder={`Original word ${index + 1}`}
                onChange={(event) => {
                  const next = event.currentTarget.value;
                  setData((prev) => ({
                    ...prev,
                    words: prev.words.map((row) =>
                      row.id === word.id ? { ...row, word: next } : row
                    )
                  }));
                }}
                onBeforeInput={(event) =>
                  handleTypingBeforeInputEvent(
                    typing,
                    event,
                    (value) => {
                      setData((prev) => ({
                        ...prev,
                        words: prev.words.map((row) =>
                          row.id === word.id ? { ...row, word: value } : row
                        )
                      }));
                    },
                    lipi
                  )
                }
                onBlur={() => {
                  field.onBlur();
                  typing.clearContext();
                  setData((prev) => inferSurupaPuzzleData(prev));
                  commit();
                }}
                onKeyDown={(event) => clearTypingContextOnKeyDown(event, typing)}
              />
              <Button
                size="icon"
                variant="ghost"
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
            <div className="space-y-3">
              {syllables.map((syllable, syllableIndex) => (
                <div key={`${word.id}-${syllableIndex}`} className="rounded-xl bg-violet-500/5 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="rounded-md bg-violet-600 px-2 py-0.5 text-sm font-semibold text-white">
                      {syllable}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          words: prev.words.map((row) =>
                            row.id !== word.id
                              ? row
                              : {
                                  ...row,
                                  alternatives: row.alternatives.map((list, i) =>
                                    i === syllableIndex ? [...list, ''] : list
                                  )
                                }
                          )
                        }));
                        commit();
                      }}
                    >
                      <Plus className="size-3.5" />
                      Alternative
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(alternatives[syllableIndex] ?? []).map((alt, altIndex) => (
                      <div key={`${word.id}-${syllableIndex}-${altIndex}`} className="flex items-center gap-1">
                        <Input
                          value={alt}
                          className="w-28"
                          {...field}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setData((prev) => ({
                              ...prev,
                              words: prev.words.map((row) =>
                                row.id !== word.id
                                  ? row
                                  : {
                                      ...row,
                                      alternatives: row.alternatives.map((list, i) =>
                                        i === syllableIndex
                                          ? list.map((item, j) => (j === altIndex ? value : item))
                                          : list
                                      )
                                    }
                              )
                            }));
                          }}
                          onBeforeInput={(event) =>
                            handleTypingBeforeInputEvent(
                              typing,
                              event,
                              (value) => {
                                setData((prev) => ({
                                  ...prev,
                                  words: prev.words.map((row) =>
                                    row.id !== word.id
                                      ? row
                                      : {
                                          ...row,
                                          alternatives: row.alternatives.map((list, i) =>
                                            i === syllableIndex
                                              ? list.map((item, j) =>
                                                  j === altIndex ? value : item
                                                )
                                              : list
                                          )
                                        }
                                  )
                                }));
                              },
                              lipi
                            )
                          }
                          onBlur={() => {
                            field.onBlur();
                            typing.clearContext();
                            commit();
                          }}
                          onKeyDown={(event) => clearTypingContextOnKeyDown(event, typing)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setData((prev) => ({
                              ...prev,
                              words: prev.words.map((row) =>
                                row.id !== word.id
                                  ? row
                                  : {
                                      ...row,
                                      alternatives: row.alternatives.map((list, i) =>
                                        i === syllableIndex
                                          ? list.filter((_, j) => j !== altIndex)
                                          : list
                                      )
                                    }
                              )
                            }));
                            commit();
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
