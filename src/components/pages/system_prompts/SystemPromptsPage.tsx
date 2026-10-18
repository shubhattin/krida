import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import {
  DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM,
  DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM_TITLE,
  DEFAULT_IMAGE_PROMPT_SYSTEM,
  DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE
} from '~/util/ai/image_prompt_defaults';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '~/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Copy, Lock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownView } from '~/components/ui/markdown-view';
import { PromptMarkdownEditor } from './PromptMarkdownEditor';
import type { ImagePromptSubject } from './SystemPromptPicker';

const SUBJECT_TABS: Array<{ value: ImagePromptSubject | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'puzzle', label: 'Puzzle cards' },
  { value: 'collection', label: 'Collection covers' }
];

const DEFAULT_PROMPTS = {
  puzzle: DEFAULT_IMAGE_PROMPT_SYSTEM,
  collection: DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM
} satisfies Record<ImagePromptSubject, string>;

const DEFAULT_LABELS = {
  puzzle: `${DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE} — puzzle cards`,
  collection: `${DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM_TITLE} — collection covers`
} satisfies Record<ImagePromptSubject, string>;

const char_hint = (content: string) =>
  content.trim() ? `${content.trim().length} chars` : 'empty';

export function SystemPromptsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [subject_filter, setSubjectFilter] = useState<ImagePromptSubject | 'all'>('all');
  const [search, setSearch] = useState('');
  const [add_open, setAddOpen] = useState(false);
  const [new_title, setNewTitle] = useState('');
  const [new_subject, setNewSubject] = useState<ImagePromptSubject>('puzzle');
  const [editing_id, setEditingId] = useState<number | null>(null);
  const [edit_title, setEditTitle] = useState('');
  const [edit_content, setEditContent] = useState('');
  const [delete_id, setDeleteId] = useState<number | null>(null);
  /** Accordion open values; everything collapsed by default. */
  const [open_items, setOpenItems] = useState<string[]>([]);
  const [highlighted_id, setHighlightedId] = useState<string | null>(() => {
    const match =
      typeof window !== 'undefined' ? window.location.hash.match(/^#template-(\d+)$/) : null;
    return match ? `template-${match[1]}` : null;
  });

  const apply_hash = () => {
    const hash = window.location.hash;
    const match = hash.match(/^#template-(\d+)$/);
    if (!match) return;
    const key = `template-${match[1]}`;
    setHighlightedId(key);
    setOpenItems((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setTimeout(() => {
      document.getElementById(key)?.scrollIntoView({ block: 'center' });
    }, 60);
  };

  // Open/scroll once the list has loaded (items render only after the query resolves).
  const templates_q = useQuery(trpc.system_prompts.list.queryOptions({}));
  const list_loaded = templates_q.isSuccess;
  useEffect(() => {
    if (list_loaded) apply_hash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list_loaded]);
  useEffect(() => {
    window.addEventListener('hashchange', apply_hash);
    return () => window.removeEventListener('hashchange', apply_hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.system_prompts.list.queryKey() });

  const create_mut = useMutation(
    trpc.system_prompts.create.mutationOptions({
      onSuccess: (row) => {
        toast.success(`Template “${row.title}” created`);
        setNewTitle('');
        setAddOpen(false);
        // Unfilter so the new card is visible and highlightable.
        setSubjectFilter('all');
        setSearch('');
        setHighlightedId(`template-${row.id}`);
        setOpenItems([`template-${row.id}`]);
        void invalidate();
      },
      onError: (e) => toast.error(e.message || 'Failed to create template')
    })
  );

  const update_mut = useMutation(
    trpc.system_prompts.update.mutationOptions({
      onSuccess: () => {
        toast.success('Template saved');
        setEditingId(null);
        void invalidate();
      },
      onError: (e) => toast.error(e.message || 'Failed to save template')
    })
  );

  const delete_mut = useMutation(
    trpc.system_prompts.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Template deleted');
        setDeleteId(null);
        void invalidate();
      },
      onError: (e) => toast.error(e.message || 'Failed to delete template')
    })
  );

  const rows = templates_q.data ?? [];
  const filtered = rows.filter((t) => {
    if (subject_filter !== 'all' && t.subject !== subject_filter) return false;
    const q = search.trim().toLowerCase();
    if (q && !t.title.toLowerCase().includes(q)) return false;
    return true;
  });

  const copy_text = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  const visible_defaults: ImagePromptSubject[] =
    subject_filter === 'all' ? ['puzzle', 'collection'] : [subject_filter];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Image System Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Image-prompt templates for puzzle cards and collection covers. The built-in defaults are
            static in code; templates here are selectable in the image tool (single + batch).
          </p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          New template
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={subject_filter}
          onValueChange={(v) => {
            if (v === 'all' || v === 'puzzle' || v === 'collection') setSubjectFilter(v);
          }}
        >
          <TabsList>
            {SUBJECT_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="max-w-sm"
        />
      </div>

      {templates_q.isPending ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading templates…</p>
      ) : templates_q.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          Failed to load templates. {templates_q.error.message}
        </p>
      ) : (
        <Accordion
          value={open_items}
          onValueChange={setOpenItems}
          className="flex flex-col gap-2.5"
        >
          {visible_defaults.map((subject) => (
            <AccordionItem
              key={`default-${subject}`}
              value={`default-${subject}`}
              className="rounded-xl border border-border px-4"
            >
              <AccordionTrigger className="py-3.5 hover:no-underline">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 pr-2 text-left">
                  <span className="truncate text-sm font-semibold">{DEFAULT_LABELS[subject]}</span>
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="size-3" />
                    Built-in
                  </Badge>
                  <span className="text-xs font-normal text-muted-foreground">
                    {char_hint(DEFAULT_PROMPTS[subject])}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-2.5 pb-4">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void copy_text(DEFAULT_PROMPTS[subject])}
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
                    <MarkdownView>{DEFAULT_PROMPTS[subject]}</MarkdownView>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? `No templates match “${search}”.` : 'No templates yet — create one.'}
            </p>
          ) : (
            filtered.map((template) => {
              const key = `template-${template.id}`;
              return (
                <div key={template.id} id={key}>
                  <AccordionItem
                    value={key}
                    className={`rounded-xl border border-border px-4 ${highlighted_id === key ? 'ring-2 ring-primary' : ''}`}
                  >
                    <AccordionTrigger className="py-3.5 hover:no-underline">
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 pr-2 text-left">
                        <span className="truncate text-sm font-semibold">{template.title}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {template.subject === 'collection' ? 'Collection' : 'Puzzle'} · id{' '}
                          {template.id}
                        </span>
                        {template.content.trim() ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            {char_hint(template.content)}
                          </span>
                        ) : (
                          <Badge variant="outline">Empty</Badge>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {editing_id === template.id ? (
                        <div className="space-y-3 pb-4">
                          <Input
                            value={edit_title}
                            onChange={(e) => setEditTitle(e.currentTarget.value)}
                            placeholder="Title"
                            maxLength={200}
                          />
                          <Tabs defaultValue="edit">
                            <TabsList>
                              <TabsTrigger value="edit">Edit</TabsTrigger>
                              <TabsTrigger value="view">Preview</TabsTrigger>
                            </TabsList>
                            <TabsContent value="edit">
                              <PromptMarkdownEditor
                                value={edit_content}
                                onChange={setEditContent}
                                placeholder="System prompt markdown…"
                              />
                            </TabsContent>
                            <TabsContent value="view">
                              <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
                                {edit_content.trim() ? (
                                  <MarkdownView>{edit_content}</MarkdownView>
                                ) : (
                                  <p className="text-muted-foreground">Nothing to preview.</p>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={update_mut.isPending || !edit_title.trim()}
                              onClick={() =>
                                update_mut.mutate({
                                  id: template.id,
                                  title: edit_title,
                                  content: edit_content
                                })
                              }
                            >
                              {update_mut.isPending ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 pb-4">
                          <div className="flex shrink-0 items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void copy_text(template.content)}
                            >
                              <Copy className="size-3.5" />
                              Copy
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(template.id);
                                setEditTitle(template.title);
                                setEditContent(template.content);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Delete template"
                              onClick={() => setDeleteId(template.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
                            {template.content.trim() ? (
                              <MarkdownView>{template.content}</MarkdownView>
                            ) : (
                              <p className="text-muted-foreground">
                                Empty template — click Edit to write the prompt.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </div>
              );
            })
          )}
        </Accordion>
      )}

      <Dialog open={add_open} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New system prompt template</DialogTitle>
            <DialogDescription>Created empty — edit it after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Tabs
              value={new_subject}
              onValueChange={(v) => {
                if (v === 'puzzle' || v === 'collection') setNewSubject(v);
              }}
            >
              <TabsList>
                <TabsTrigger value="puzzle">Puzzle cards</TabsTrigger>
                <TabsTrigger value="collection">Collection covers</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              value={new_title}
              onChange={(e) => setNewTitle(e.currentTarget.value)}
              placeholder="Template title…"
              maxLength={200}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!new_title.trim() || create_mut.isPending}
              onClick={() => create_mut.mutate({ title: new_title.trim(), subject: new_subject })}
            >
              {create_mut.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={delete_id != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Past batch rows keep their stored snapshot, but new generations can no longer select
              it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={delete_mut.isPending}
              onClick={() => delete_id != null && delete_mut.mutate({ id: delete_id })}
            >
              {delete_mut.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
