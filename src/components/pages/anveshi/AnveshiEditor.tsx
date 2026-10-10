'use client';

import { useMemo, type KeyboardEvent } from 'react';
import { useAtom, type PrimitiveAtom } from 'jotai';
import { Check, Plus, Trash2 } from 'lucide-react';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { isLipiToggleKey, LipiLekhikaSwitch } from '~/components/puzzle/LipiLekhikaSwitch';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { useEditorHistoryActions, useHistoryTextField } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import {
  createAnveshiOption,
  createAnveshiQuestion,
  type AnveshiPuzzleData
} from '~/util/anveshi/data';

export function AnveshiEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<AnveshiPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  const [lipi, setLipi] = useAtom(lipiAtom);
  const { commit } = useEditorHistoryActions();
  const typing = useMemo(() => createTypingContext('Devanagari'), []);
  const field = useHistoryTextField();

  const onLipiKey = (event: KeyboardEvent) => {
    if (isLipiToggleKey(event)) {
      event.preventDefault();
      setLipi((prev) => !prev);
    }
    clearTypingContextOnKeyDown(event, typing);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50/80 via-white to-indigo-50/70 p-4 dark:border-sky-900/40 dark:from-sky-950/30 dark:via-slate-950 dark:to-indigo-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Questions</h2>
        <div className="flex items-center gap-2">
          <LipiLekhikaSwitch
            checked={lipi}
            onCheckedChange={setLipi}
            label="Lipi Lekhika for questions"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setData((prev) => ({
                ...prev,
                questions: [...prev.questions, createAnveshiQuestion()]
              }));
              commit();
            }}
          >
            <Plus className="size-4" />
            Add question
          </Button>
        </div>
      </div>
      {data.questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add at least one question with two options and a marked correct answer.
        </p>
      ) : null}
      <div className="space-y-4">
        {data.questions.map((question, index) => (
          <article
            key={question.id}
            className="space-y-3 rounded-2xl border border-sky-200/60 bg-white/75 p-4 dark:border-sky-900/40 dark:bg-slate-950/50"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="rounded-full bg-sky-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                Q{index + 1}
              </p>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setData((prev) => ({
                    ...prev,
                    questions: prev.questions.filter((row) => row.id !== question.id)
                  }));
                  commit();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Prompt</Label>
              <Textarea
                value={question.prompt}
                rows={2}
                {...field}
                placeholder="Question text"
                onChange={(event) => {
                  const prompt = event.currentTarget.value;
                  setData((prev) => ({
                    ...prev,
                    questions: prev.questions.map((row) =>
                      row.id === question.id ? { ...row, prompt } : row
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
                        questions: prev.questions.map((row) =>
                          row.id === question.id ? { ...row, prompt: value } : row
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
                onKeyDown={onLipiKey}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Hint (optional)</Label>
                <Input
                  value={question.hint}
                  {...field}
                  placeholder="Shown on request"
                  onChange={(event) => {
                    const hint = event.currentTarget.value;
                    setData((prev) => ({
                      ...prev,
                      questions: prev.questions.map((row) =>
                        row.id === question.id ? { ...row, hint } : row
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
                          questions: prev.questions.map((row) =>
                            row.id === question.id ? { ...row, hint: value } : row
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
                  onKeyDown={onLipiKey}
                />
              </div>
              <div className="space-y-1">
                <Label>Explanation (optional)</Label>
                <Input
                  value={question.explanation}
                  {...field}
                  placeholder="Shown after answering"
                  onChange={(event) => {
                    const explanation = event.currentTarget.value;
                    setData((prev) => ({
                      ...prev,
                      questions: prev.questions.map((row) =>
                        row.id === question.id ? { ...row, explanation } : row
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
                          questions: prev.questions.map((row) =>
                            row.id === question.id ? { ...row, explanation: value } : row
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
                  onKeyDown={onLipiKey}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setData((prev) => ({
                      ...prev,
                      questions: prev.questions.map((row) =>
                        row.id === question.id
                          ? { ...row, options: [...row.options, createAnveshiOption()] }
                          : row
                      )
                    }));
                    commit();
                  }}
                >
                  <Plus className="size-3.5" />
                  Option
                </Button>
              </div>
              {question.options.map((option, optionIndex) => {
                const selected = question.correctOptionId === option.id;
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant={selected ? 'default' : 'outline'}
                      className={cn(selected && 'bg-linear-to-br from-sky-500 to-indigo-600')}
                      title="Mark as correct"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          questions: prev.questions.map((row) =>
                            row.id === question.id ? { ...row, correctOptionId: option.id } : row
                          )
                        }));
                        commit();
                      }}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Input
                      value={option.text}
                      {...field}
                      placeholder={`Option ${optionIndex + 1}`}
                      className={cn(selected && 'border-sky-400')}
                      onChange={(event) => {
                        const text = event.currentTarget.value;
                        setData((prev) => ({
                          ...prev,
                          questions: prev.questions.map((row) =>
                            row.id === question.id
                              ? {
                                  ...row,
                                  options: row.options.map((item) =>
                                    item.id === option.id ? { ...item, text } : item
                                  )
                                }
                              : row
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
                              questions: prev.questions.map((row) =>
                                row.id === question.id
                                  ? {
                                      ...row,
                                      options: row.options.map((item) =>
                                        item.id === option.id ? { ...item, text: value } : item
                                      )
                                    }
                                  : row
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
                      onKeyDown={onLipiKey}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={question.options.length <= 2}
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          questions: prev.questions.map((row) => {
                            if (row.id !== question.id) return row;
                            const options = row.options.filter((item) => item.id !== option.id);
                            return {
                              ...row,
                              options,
                              correctOptionId:
                                row.correctOptionId === option.id
                                  ? (options[0]?.id ?? '')
                                  : row.correctOptionId
                            };
                          })
                        }));
                        commit();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
