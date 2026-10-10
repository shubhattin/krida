'use client';

import { useAtom, type PrimitiveAtom } from 'jotai';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import {
  ATTACHMENT_TYPE_LIST,
  ATTACHMENT_TYPE_NAMES,
  type attachment_list_type
} from '~/db/db_shared_vals';
import { useEditorHistoryActions } from '~/hooks/useEditorHistory';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';

export type EditableAttachment = {
  id: number | null;
  type: attachment_list_type;
  url: string;
  title: string | null;
  order_index: number;
};

export function SimpleGameAttachments({ atom }: { atom: PrimitiveAtom<EditableAttachment[]> }) {
  const [attachments, setAttachments] = useAtom(atom);
  const { commit } = useEditorHistoryActions();

  const add = () => {
    setAttachments((prev) => [
      ...prev,
      { id: null, type: 'link', url: '', title: null, order_index: prev.length + 1 }
    ]);
    commit();
  };

  const remove = (index: number) => {
    setAttachments((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order_index: i + 1 }))
    );
    commit();
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Media attachments</h2>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <PlusIcon className="size-4" />
          Add
        </Button>
      </div>
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Optional links and YouTube media.</p>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment, index) => (
            <div
              key={`${attachment.id ?? 'new'}-${index}`}
              className="grid gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-[8rem_1fr_auto]"
            >
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={attachment.type}
                  onValueChange={(value) => {
                    const type = ATTACHMENT_TYPE_LIST.find((item) => item === value);
                    if (!type) return;
                    setAttachments((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, type } : item))
                    );
                    commit();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ATTACHMENT_TYPE_NAMES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>URL</Label>
                <Input
                  value={attachment.url}
                  onChange={(event) => {
                    const url = event.currentTarget.value;
                    setAttachments((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, url } : item))
                    );
                  }}
                  onBlur={() => commit()}
                />
                <Input
                  value={attachment.title ?? ''}
                  placeholder="Title (optional)"
                  onChange={(event) => {
                    const title = event.currentTarget.value || null;
                    setAttachments((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, title } : item))
                    );
                  }}
                  onBlur={() => commit()}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="self-end text-destructive"
                onClick={() => remove(index)}
                aria-label="Remove attachment"
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
