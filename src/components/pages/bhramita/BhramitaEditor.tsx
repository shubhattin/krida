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
import { createBhramitaWord, type BhramitaPuzzleData } from '~/util/bhramita/data';
import { inferBhramitaPuzzleData } from '~/util/bhramita/infer';

export function BhramitaEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<BhramitaPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  const [lipi] = useAtom(lipiAtom);
  const { commit } = useEditorHistoryActions();
  const typing = useMemo(() => createTypingContext('Devanagari'), []);
  const field = useHistoryTextField();
  const inferred = inferBhramitaPuzzleData(data);

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200/70 bg-linear-to-br from-emerald-50/80 via-white to-teal-50/70 p-4 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-950 dark:to-teal-950/20">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Words</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setData((prev) => ({ ...prev, words: [...prev.words, createBhramitaWord()] }));
            commit();
          }}
        >
          <Plus className="size-4" />
          Add word
        </Button>
      </div>
      <div className="space-y-3">
        {data.words.map((word, index) => {
          const syllables = inferred.words[index]?.syllables ?? [];
          return (
            <div
              key={word.id}
              className="rounded-2xl border border-emerald-200/60 bg-white/70 p-3 dark:border-emerald-900/40 dark:bg-slate-950/50"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={word.word}
                  {...field}
                  placeholder={`Word ${index + 1}`}
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
                    setData((prev) => inferBhramitaPuzzleData(prev));
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
              <div className="mt-2 flex flex-wrap gap-1.5">
                {syllables.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Syllables appear as you type.</span>
                ) : (
                  syllables.map((syllable, syllableIndex) => (
                    <span
                      key={`${word.id}-${syllableIndex}`}
                      className="rounded-lg bg-emerald-500/15 px-2 py-1 font-medium text-emerald-800 dark:text-emerald-200"
                    >
                      {syllable}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
