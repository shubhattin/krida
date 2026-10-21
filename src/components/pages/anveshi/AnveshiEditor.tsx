'use client';

import { useState } from 'react';
import { useAtom, type PrimitiveAtom } from 'jotai';
import {
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleHelp,
  Copy,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { LipiLekhikaSwitch } from '~/components/puzzle/LipiLekhikaSwitch';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { useEditorHistoryActions } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import { createGameItemId } from '~/util/games/ids';
import {
  createAnveshiOption,
  createAnveshiQuestion,
  type AnveshiPuzzleData,
  type AnveshiQuestion
} from '~/util/anveshi/data';
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

const letter = (index: number) => String.fromCharCode(65 + index);

function cloneQuestion(question: AnveshiQuestion): AnveshiQuestion {
  const idMap = new Map(question.options.map((option) => [option.id, createGameItemId()]));
  return {
    ...question,
    id: createGameItemId(),
    options: question.options.map((option) => ({
      ...option,
      id: idMap.get(option.id)!
    })),
    correctOptionId: idMap.get(question.correctOptionId) ?? ''
  };
}

export function AnveshiEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<AnveshiPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  // Options are Devanagari by default; question text is often English, so its typing starts off.
  const [optionLipi, setOptionLipi] = useAtom(lipiAtom);
  const [textLipi, setTextLipi] = useState(false);
  const { commit } = useEditorHistoryActions();
  const bindOption = useLipiBinder(optionLipi, setOptionLipi);
  const bindText = useLipiBinder(textLipi, setTextLipi);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // While a question is being dragged every card is collapsed, then the previous state returns.
  const [reordering, setReordering] = useState(false);

  const updateQuestion = (id: string, update: (question: AnveshiQuestion) => AnveshiQuestion) =>
    setData((prev) => ({
      ...prev,
      questions: prev.questions.map((row) => (row.id === id ? update(row) : row))
    }));

  const addQuestion = () => {
    const question = createAnveshiQuestion();
    question.options.push(createAnveshiOption(), createAnveshiOption());
    setData((prev) => ({ ...prev, questions: [...prev.questions, question] }));
    commit();
    focusFieldSoon(`anveshi-prompt-${question.id}`);
  };

  const addOption = (questionId: string) => {
    const option = createAnveshiOption();
    updateQuestion(questionId, (row) => ({
      ...row,
      options: [...row.options, option]
    }));
    commit();
    focusFieldSoon(`anveshi-option-${option.id}`);
  };

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed =
    data.questions.length > 0 && data.questions.every((question) => collapsed.has(question.id));

  return (
    <EditorSection
      title="Questions"
      count={data.questions.length}
      accentClassName="from-sky-500 to-indigo-600"
      description="Drag to reorder. Click a letter to mark the correct option. Enter in an option moves to the next one."
      actions={
        <>
          <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 py-0.5 pr-1 pl-2 text-xs text-muted-foreground">
            Text
            <LipiLekhikaSwitch
              checked={textLipi}
              onCheckedChange={setTextLipi}
              label="Lipi Lekhika for question, hint and explanation"
            />
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 py-0.5 pr-1 pl-2 text-xs text-muted-foreground">
            Options
            <LipiLekhikaSwitch
              checked={optionLipi}
              onCheckedChange={setOptionLipi}
              label="Lipi Lekhika for options"
            />
          </span>
          {data.questions.length > 1 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCollapsed(
                  allCollapsed ? new Set() : new Set(data.questions.map((question) => question.id))
                )
              }
            >
              {allCollapsed ? (
                <ChevronsUpDown className="size-4" />
              ) : (
                <ChevronsDownUp className="size-4" />
              )}
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={addQuestion}
            className="bg-linear-to-r from-sky-500 to-indigo-600 text-white"
          >
            <Plus className="size-4" />
            Add question
          </Button>
        </>
      }
    >
      {data.questions.length === 0 ? (
        <EditorEmptyState
          icon={<CircleHelp className="size-8" />}
          title="No questions yet"
          hint="Each question needs a prompt, at least two options and one marked correct answer."
          action={
            <Button size="sm" variant="outline" onClick={addQuestion}>
              <Plus className="size-4" />
              Add first question
            </Button>
          }
        />
      ) : (
        <SortableList
          items={data.questions}
          onReorder={(questions) => {
            setData((prev) => ({ ...prev, questions }));
            commit();
          }}
          onDragStart={() => setReordering(true)}
          onDragSettled={() => setReordering(false)}
          className="space-y-3"
        >
          {(question, index) => {
            const isCollapsed = reordering || collapsed.has(question.id);
            const correct = question.options.find(
              (option) => option.id === question.correctOptionId
            );
            const incomplete =
              !question.prompt.trim() ||
              question.options.length < 2 ||
              question.options.some((option) => !option.text.trim()) ||
              !correct;
            return (
              <SortableRow key={question.id} id={question.id} className="rounded-2xl">
                {(handle) => (
                  <article
                    className={cn(
                      'rounded-2xl border bg-background/70',
                      incomplete ? 'border-amber-400/50' : 'border-border/70'
                    )}
                  >
                    <header className="flex items-center gap-2 p-2">
                      <DragHandle {...handle} label="Drag to reorder question" />
                      <span className="rounded-full bg-linear-to-r from-sky-500 to-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white tabular-nums">
                        Q{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(question.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        {isCollapsed ? (
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <span className="font-semibold">
                              {question.prompt.trim() || 'Untitled question'}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              → {correct?.text.trim() || 'no answer'} · {question.options.length}{' '}
                              options
                            </span>
                          </span>
                        ) : (
                          <span className="flex-1" />
                        )}
                        {incomplete ? (
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Incomplete
                          </span>
                        ) : null}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground"
                        title="Duplicate question"
                        onClick={() => {
                          setData((prev) => {
                            const at = prev.questions.findIndex((row) => row.id === question.id);
                            const questions = [...prev.questions];
                            questions.splice(at + 1, 0, cloneQuestion(question));
                            return { ...prev, questions };
                          });
                          commit();
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        title="Delete question"
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
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                        onClick={() => toggleCollapsed(question.id)}
                      >
                        <ChevronDown
                          className={cn(
                            'size-4 transition-transform',
                            !isCollapsed && 'rotate-180'
                          )}
                        />
                      </Button>
                    </header>
                    {isCollapsed ? null : (
                      <div className="space-y-4 border-t border-border/50 p-3 sm:p-4">
                        <Textarea
                          data-focus-key={`anveshi-prompt-${question.id}`}
                          rows={2}
                          placeholder="Question prompt"
                          className="min-h-14 text-base font-semibold"
                          {...bindText(question.prompt, (prompt) =>
                            updateQuestion(question.id, (row) => ({
                              ...row,
                              prompt
                            }))
                          )}
                        />
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Options — click a letter to mark the answer
                          </Label>
                          <SortableList
                            items={question.options}
                            onReorder={(options) => {
                              updateQuestion(question.id, (row) => ({
                                ...row,
                                options
                              }));
                              commit();
                            }}
                            className="grid gap-2"
                          >
                            {(option, optionIndex) => {
                              const selected = question.correctOptionId === option.id;
                              return (
                                <SortableRow key={option.id} id={option.id} className="rounded-xl">
                                  {(optionHandle) => (
                                    <div className="flex items-center gap-1.5">
                                      <DragHandle
                                        {...optionHandle}
                                        className="size-6"
                                        label="Drag to reorder option"
                                      />
                                      <button
                                        type="button"
                                        title={selected ? 'Correct answer' : 'Mark as correct'}
                                        aria-pressed={selected}
                                        onClick={() => {
                                          updateQuestion(question.id, (row) => ({
                                            ...row,
                                            correctOptionId: option.id
                                          }));
                                          commit();
                                        }}
                                        className={cn(
                                          'flex size-9 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-black transition-colors',
                                          selected
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600'
                                        )}
                                      >
                                        {selected ? (
                                          <Check className="size-4" strokeWidth={3} />
                                        ) : (
                                          letter(optionIndex)
                                        )}
                                      </button>
                                      <Input
                                        data-focus-key={`anveshi-option-${option.id}`}
                                        placeholder={`Option ${letter(optionIndex)}`}
                                        className={cn(
                                          'text-base',
                                          selected && 'border-emerald-500/70 bg-emerald-500/5'
                                        )}
                                        {...bindOption(
                                          option.text,
                                          (text) =>
                                            updateQuestion(question.id, (row) => ({
                                              ...row,
                                              options: row.options.map((item) =>
                                                item.id === option.id ? { ...item, text } : item
                                              )
                                            })),
                                          {
                                            onKeyDown: (event) => {
                                              if (event.key !== 'Enter') return;
                                              event.preventDefault();
                                              const next = question.options[optionIndex + 1];
                                              if (next) focusFieldSoon(`anveshi-option-${next.id}`);
                                              else addOption(question.id);
                                            }
                                          }
                                        )}
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                        title="Remove option"
                                        disabled={question.options.length <= 2}
                                        onClick={() => {
                                          updateQuestion(question.id, (row) => {
                                            const options = row.options.filter(
                                              (item) => item.id !== option.id
                                            );
                                            return {
                                              ...row,
                                              options,
                                              correctOptionId:
                                                row.correctOptionId === option.id
                                                  ? (options[0]?.id ?? '')
                                                  : row.correctOptionId
                                            };
                                          });
                                          commit();
                                        }}
                                      >
                                        <X className="size-4" />
                                      </Button>
                                    </div>
                                  )}
                                </SortableRow>
                              );
                            }}
                          </SortableList>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-7 text-muted-foreground"
                            onClick={() => addOption(question.id)}
                          >
                            <Plus className="size-3.5" />
                            Add option
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Hint (optional)</Label>
                            <Input
                              placeholder="Shown when the player asks"
                              {...bindText(question.hint, (hint) =>
                                updateQuestion(question.id, (row) => ({
                                  ...row,
                                  hint
                                }))
                              )}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Explanation (optional)
                            </Label>
                            <Input
                              placeholder="Shown after answering"
                              {...bindText(question.explanation, (explanation) =>
                                updateQuestion(question.id, (row) => ({
                                  ...row,
                                  explanation
                                }))
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                )}
              </SortableRow>
            );
          }}
        </SortableList>
      )}
      {data.questions.length > 0 ? (
        <button
          type="button"
          onClick={addQuestion}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 py-2.5 text-sm text-muted-foreground transition-colors hover:border-sky-400/70 hover:text-foreground"
        >
          <Plus className="size-4" />
          Add question
        </button>
      ) : null}
    </EditorSection>
  );
}
