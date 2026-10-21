'use client';

import { useState } from 'react';
import { useAtom, type PrimitiveAtom } from 'jotai';
import { ArrowLeftRight, Link2, Plus, Trash2, X } from 'lucide-react';
import { LipiLekhikaSwitch } from '~/components/puzzle/LipiLekhikaSwitch';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { useEditorHistoryActions } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import {
  createDvayiColumnItem,
  type DvayiColumnItem,
  type DvayiPuzzleData
} from '~/util/dvayi/data';
import { inferDvayiPuzzleData } from '~/util/dvayi/infer';
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
import { pairColor, withAlpha } from './pair_colors';

type Pair = { id: string; left: DvayiColumnItem; right: DvayiColumnItem };
type Side = 'left' | 'right';

function derivePairs(data: DvayiPuzzleData) {
  const inferred = inferDvayiPuzzleData(data);
  const rightById = new Map(data.right.map((item) => [item.id, item]));
  const matchByLeft = new Map(inferred.matches.map((match) => [match.leftId, match.rightId]));
  const pairs: Pair[] = [];
  for (const left of data.left) {
    const rightId = matchByLeft.get(left.id);
    const right = rightId ? rightById.get(rightId) : undefined;
    if (right) pairs.push({ id: left.id, left, right });
  }
  const pairedLeft = new Set(pairs.map((pair) => pair.left.id));
  const pairedRight = new Set(pairs.map((pair) => pair.right.id));
  return {
    pairs,
    looseLeft: data.left.filter((item) => !pairedLeft.has(item.id)),
    looseRight: data.right.filter((item) => !pairedRight.has(item.id))
  };
}

export function DvayiEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<DvayiPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  const [lipi, setLipi] = useAtom(lipiAtom);
  const { commit } = useEditorHistoryActions();
  const bind = useLipiBinder(lipi, setLipi);
  const { pairs, looseLeft, looseRight } = derivePairs(data);
  const [pendingLoose, setPendingLoose] = useState<{
    side: Side;
    id: string;
  } | null>(null);

  const setItemText = (side: Side, id: string, text: string) =>
    setData((prev) => ({
      ...prev,
      [side]: prev[side].map((row) => (row.id === id ? { ...row, text } : row))
    }));

  const addPair = () => {
    const left = createDvayiColumnItem();
    const right = createDvayiColumnItem();
    setData((prev) => ({
      left: [...prev.left, left],
      right: [...prev.right, right],
      matches: [...prev.matches, { leftId: left.id, rightId: right.id }]
    }));
    commit();
    focusFieldSoon(`dvayi-left-${left.id}`);
  };

  const removePair = (pair: Pair) => {
    setData((prev) => ({
      left: prev.left.filter((row) => row.id !== pair.left.id),
      right: prev.right.filter((row) => row.id !== pair.right.id),
      matches: prev.matches.filter(
        (match) => match.leftId !== pair.left.id && match.rightId !== pair.right.id
      )
    }));
    commit();
  };

  const swapSides = (pair: Pair) => {
    setData((prev) => ({
      ...prev,
      left: prev.left.map((row) =>
        row.id === pair.left.id ? { ...row, text: pair.right.text } : row
      ),
      right: prev.right.map((row) =>
        row.id === pair.right.id ? { ...row, text: pair.left.text } : row
      )
    }));
    commit();
  };

  const reorderPairs = (next: Pair[]) => {
    setData((prev) => {
      const pairedLeft = new Set(next.map((pair) => pair.left.id));
      const pairedRight = new Set(next.map((pair) => pair.right.id));
      const leftById = new Map(prev.left.map((row) => [row.id, row]));
      const rightById = new Map(prev.right.map((row) => [row.id, row]));
      return {
        left: [
          ...next.flatMap((pair) => leftById.get(pair.left.id) ?? []),
          ...prev.left.filter((row) => !pairedLeft.has(row.id))
        ],
        right: [
          ...next.flatMap((pair) => rightById.get(pair.right.id) ?? []),
          ...prev.right.filter((row) => !pairedRight.has(row.id))
        ],
        matches: next.map((pair) => ({
          leftId: pair.left.id,
          rightId: pair.right.id
        }))
      };
    });
    commit();
  };

  const pickLoose = (side: Side, id: string) => {
    if (!pendingLoose || pendingLoose.side === side) {
      setPendingLoose(pendingLoose?.id === id ? null : { side, id });
      return;
    }
    const leftId = side === 'left' ? id : pendingLoose.id;
    const rightId = side === 'right' ? id : pendingLoose.id;
    setData((prev) => ({
      ...prev,
      matches: [
        ...prev.matches.filter((match) => match.leftId !== leftId && match.rightId !== rightId),
        { leftId, rightId }
      ]
    }));
    setPendingLoose(null);
    commit();
  };

  const removeLoose = (side: Side, id: string) => {
    setData((prev) => ({
      ...prev,
      [side]: prev[side].filter((row) => row.id !== id),
      matches: prev.matches.filter((match) =>
        side === 'left' ? match.leftId !== id : match.rightId !== id
      )
    }));
    if (pendingLoose?.id === id) setPendingLoose(null);
    commit();
  };

  return (
    <EditorSection
      title="Pairs"
      count={pairs.length}
      accentClassName="from-rose-500 to-orange-500"
      description="Each row is one correct match. Players see the right side shuffled. Enter jumps to the next field."
      actions={
        <>
          <LipiLekhikaSwitch
            checked={lipi}
            onCheckedChange={setLipi}
            label="Lipi Lekhika for pairs"
          />
          <Button
            size="sm"
            onClick={addPair}
            className="bg-linear-to-r from-rose-500 to-orange-500 text-white"
          >
            <Plus className="size-4" />
            Add pair
          </Button>
        </>
      }
    >
      {pairs.length === 0 && looseLeft.length === 0 && looseRight.length === 0 ? (
        <EditorEmptyState
          icon={<ArrowLeftRight className="size-8" />}
          title="No pairs yet"
          hint="Add at least two pairs. Each pair is a prompt on the left and its match on the right."
          action={
            <Button size="sm" variant="outline" onClick={addPair}>
              <Plus className="size-4" />
              Add first pair
            </Button>
          }
        />
      ) : null}

      {pairs.length > 0 ? (
        <>
          <div className="mb-1.5 hidden grid-cols-[3.75rem_1fr_2.5rem_1fr_4.5rem] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
            <span />
            <span>Left · prompt</span>
            <span />
            <span>Right · match</span>
            <span />
          </div>
          <SortableList items={pairs} onReorder={reorderPairs} className="space-y-2">
            {(pair, index) => {
              const color = pairColor(index);
              const isLast = index === pairs.length - 1;
              return (
                <SortableRow key={pair.id} id={pair.id} className="rounded-xl">
                  {(handle) => (
                    <div
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border bg-background/70 p-2 sm:grid-cols-[3.75rem_1fr_2.5rem_1fr_4.5rem]"
                      style={{ borderColor: withAlpha(color, 0.35) }}
                    >
                      <div className="row-span-2 flex items-center gap-1 sm:row-span-1">
                        <DragHandle {...handle} />
                        <span
                          className="flex size-6 items-center justify-center rounded-full text-xs font-bold text-white tabular-nums shadow-sm"
                          style={{ backgroundColor: color }}
                        >
                          {index + 1}
                        </span>
                      </div>
                      <Input
                        data-focus-key={`dvayi-left-${pair.left.id}`}
                        placeholder={`Prompt ${index + 1}`}
                        className="border-l-4 text-base"
                        style={{ borderLeftColor: color }}
                        {...bind(
                          pair.left.text,
                          (text) => setItemText('left', pair.left.id, text),
                          {
                            onKeyDown: (event) => {
                              if (event.key !== 'Enter') return;
                              event.preventDefault();
                              focusFieldSoon(`dvayi-right-${pair.right.id}`);
                            }
                          }
                        )}
                      />
                      <div className="hidden items-center justify-center sm:flex">
                        <span
                          className="flex size-8 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: withAlpha(color, 0.15),
                            color
                          }}
                        >
                          <Link2 className="size-4" />
                        </span>
                      </div>
                      <Input
                        data-focus-key={`dvayi-right-${pair.right.id}`}
                        placeholder={`Match ${index + 1}`}
                        className="col-start-2 border-r-4 text-base sm:col-start-auto"
                        style={{ borderRightColor: color }}
                        {...bind(
                          pair.right.text,
                          (text) => setItemText('right', pair.right.id, text),
                          {
                            onKeyDown: (event) => {
                              if (event.key !== 'Enter') return;
                              event.preventDefault();
                              const nextPair = pairs[index + 1];
                              if (isLast || !nextPair) addPair();
                              else focusFieldSoon(`dvayi-left-${nextPair.left.id}`);
                            }
                          }
                        )}
                      />
                      <div className="col-start-3 row-span-2 row-start-1 flex flex-col items-center sm:col-start-auto sm:row-span-1 sm:row-start-auto sm:flex-row sm:justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground"
                          title="Swap left and right"
                          onClick={() => swapSides(pair)}
                        >
                          <ArrowLeftRight className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          title="Delete pair"
                          onClick={() => removePair(pair)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </SortableRow>
              );
            }}
          </SortableList>
          <button
            type="button"
            onClick={addPair}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 py-2.5 text-sm text-muted-foreground transition-colors hover:border-rose-400/70 hover:text-foreground"
          >
            <Plus className="size-4" />
            Add pair
          </button>
        </>
      ) : null}

      {looseLeft.length > 0 || looseRight.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-800/50 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Unpaired items</p>
          <p className="mb-2 text-xs text-amber-800/80 dark:text-amber-200/70">
            Click one item on each side to pair them, or remove the ones you don&apos;t need.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['left', looseLeft],
                ['right', looseRight]
              ] as const
            ).map(([side, items]) => (
              <div key={side} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {side === 'left' ? 'Left' : 'Right'}
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing unpaired.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => {
                      const active = pendingLoose?.id === item.id;
                      return (
                        <span
                          key={item.id}
                          className={cn(
                            'inline-flex items-center overflow-hidden rounded-lg border bg-background text-sm transition-all',
                            active && 'border-amber-500 ring-2 ring-amber-400/50'
                          )}
                        >
                          <button
                            type="button"
                            className="px-2.5 py-1 hover:bg-muted"
                            onClick={() => pickLoose(side, item.id)}
                          >
                            {item.text || '…'}
                          </button>
                          <button
                            type="button"
                            aria-label="Remove item"
                            className="border-l px-1.5 py-1 text-muted-foreground hover:text-destructive"
                            onClick={() => removeLoose(side, item.id)}
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </EditorSection>
  );
}
