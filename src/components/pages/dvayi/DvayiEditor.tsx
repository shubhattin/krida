'use client';

import { useMemo, type KeyboardEvent } from 'react';
import { useAtom, type PrimitiveAtom } from 'jotai';
import { Link2, Plus, Trash2, Unlink } from 'lucide-react';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { useEditorHistoryActions, useHistoryTextField } from '~/hooks/useEditorHistory';
import { cn } from '~/lib/utils';
import {
  createDvayiColumnItem,
  type DvayiPuzzleData
} from '~/util/dvayi/data';

export function DvayiEditor({
  dataAtom,
  lipiAtom
}: {
  dataAtom: PrimitiveAtom<DvayiPuzzleData>;
  lipiAtom: PrimitiveAtom<boolean>;
}) {
  const [data, setData] = useAtom(dataAtom);
  const [lipi] = useAtom(lipiAtom);
  const { commit } = useEditorHistoryActions();
  const typing = useMemo(() => createTypingContext('Devanagari'), []);
  const field = useHistoryTextField();
  const matchedLeft = new Set(data.matches.map((match) => match.leftId));
  const matchedRight = new Set(data.matches.map((match) => match.rightId));

  const addLeft = () => {
    setData((prev) => ({ ...prev, left: [...prev.left, createDvayiColumnItem()] }));
    commit();
  };
  const addRight = () => {
    setData((prev) => ({ ...prev, right: [...prev.right, createDvayiColumnItem()] }));
    commit();
  };

  const toggleMatch = (leftId: string, rightId: string) => {
    setData((prev) => {
      const exists = prev.matches.some(
        (match) => match.leftId === leftId && match.rightId === rightId
      );
      if (exists) {
        return {
          ...prev,
          matches: prev.matches.filter(
            (match) => !(match.leftId === leftId && match.rightId === rightId)
          )
        };
      }
      return {
        ...prev,
        matches: [
          ...prev.matches.filter((match) => match.leftId !== leftId && match.rightId !== rightId),
          { leftId, rightId }
        ]
      };
    });
    commit();
  };

  const onLipiKey = (event: KeyboardEvent) => clearTypingContextOnKeyDown(event, typing);

  return (
    <section className="space-y-4 rounded-2xl border border-rose-200/70 bg-linear-to-br from-rose-50/80 via-white to-orange-50/70 p-4 dark:border-rose-900/40 dark:from-rose-950/30 dark:via-slate-950 dark:to-orange-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Match columns</h2>
        <p className="text-xs text-muted-foreground">
          Select a left item, then a right item to pair them. Click a pair again to unlink.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Left</h3>
            <Button size="sm" variant="outline" onClick={addLeft}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {data.left.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.text}
                {...field}
                className={cn(matchedLeft.has(item.id) && 'border-rose-400/80')}
                onChange={(event) => {
                  const text = event.currentTarget.value;
                  setData((prev) => ({
                    ...prev,
                    left: prev.left.map((row) => (row.id === item.id ? { ...row, text } : row))
                  }));
                }}
                onBeforeInput={(event) =>
                  handleTypingBeforeInputEvent(typing, event, (value) => {
                    setData((prev) => ({
                      ...prev,
                      left: prev.left.map((row) =>
                        row.id === item.id ? { ...row, text: value } : row
                      )
                    }));
                  }, lipi)
                }
                onBlur={() => {
                  field.onBlur();
                  typing.clearContext();
                  commit();
                }}
                onKeyDown={onLipiKey}
                placeholder={`Left ${index + 1}`}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setData((prev) => ({
                    ...prev,
                    left: prev.left.filter((row) => row.id !== item.id),
                    matches: prev.matches.filter((match) => match.leftId !== item.id)
                  }));
                  commit();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Right</h3>
            <Button size="sm" variant="outline" onClick={addRight}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {data.right.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.text}
                {...field}
                className={cn(matchedRight.has(item.id) && 'border-orange-400/80')}
                onChange={(event) => {
                  const text = event.currentTarget.value;
                  setData((prev) => ({
                    ...prev,
                    right: prev.right.map((row) => (row.id === item.id ? { ...row, text } : row))
                  }));
                }}
                onBeforeInput={(event) =>
                  handleTypingBeforeInputEvent(typing, event, (value) => {
                    setData((prev) => ({
                      ...prev,
                      right: prev.right.map((row) =>
                        row.id === item.id ? { ...row, text: value } : row
                      )
                    }));
                  }, lipi)
                }
                onBlur={() => {
                  field.onBlur();
                  typing.clearContext();
                  commit();
                }}
                onKeyDown={onLipiKey}
                placeholder={`Right ${index + 1}`}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setData((prev) => ({
                    ...prev,
                    right: prev.right.filter((row) => row.id !== item.id),
                    matches: prev.matches.filter((match) => match.rightId !== item.id)
                  }));
                  commit();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Pairs</h3>
        {data.left.length === 0 || data.right.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add items on both sides to pair them.</p>
        ) : (
          <div className="grid gap-2">
            {data.left.map((left) => (
              <div key={left.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-28 rounded-lg bg-rose-500/10 px-2 py-1 text-sm font-medium">
                  {left.text || '…'}
                </span>
                {data.right.map((right) => {
                  const active = data.matches.some(
                    (match) => match.leftId === left.id && match.rightId === right.id
                  );
                  return (
                    <Button
                      key={right.id}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className={cn(active && 'bg-linear-to-r from-rose-500 to-orange-500')}
                      onClick={() => toggleMatch(left.id, right.id)}
                    >
                      {active ? <Link2 className="size-3.5" /> : <Unlink className="size-3.5" />}
                      {right.text || '…'}
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
