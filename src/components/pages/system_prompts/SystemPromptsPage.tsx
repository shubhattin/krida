import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import {
  DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM,
  DEFAULT_IMAGE_PROMPT_SYSTEM,
  DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE
} from '~/util/ai/image_gen';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
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
import { Streamdown } from 'streamdown';
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
  const [highlighted_id, setHighlightedId] = useState<string | null>(() => {
    const match =
      typeof window !== 'undefined' ? window.location.hash.match(/^#template-(\d+)$/) : null;
    return match ? `template-${match[1]}` : null;
  });

  useEffect(() => {
    if (highlighted_id) {
      const timer = setTimeout(() => {
        document.getElementById(highlighted_id)?.scrollIntoView({ block: 'center' });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [highlighted_id]);

  const templates_q = useQuery(trpc.system_prompts.list.queryOptions({}));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trpc.system_prompts.list.queryKey() });

  const create_mut = useMutation(
    trpc.system_prompts.create.mutationOptions({
      onSuccess: (row) => {
        toast.success(`Template “${row.title}” created`);
        setNewTitle('');
        setAddOpen(false);
        setHighlightedId(`template-${row.id}`);
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
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">System Prompts</h1>
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

      {(subject_filter === 'all' || subject_filter === 'puzzle') && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE} — puzzle cards
              </CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Lock className="size-3" />
                Built-in
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void copy_text(DEFAULT_PROMPTS.puzzle)}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/20 p-4 text-sm leading-relaxed">
              <Streamdown>{DEFAULT_PROMPTS.puzzle}</Streamdown>
            </div>
          </CardContent>
        </Card>
      )}
      {(subject_filter === 'all' || subject_filter === 'collection') && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE} — collection covers
              </CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Lock className="size-3" />
                Built-in
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void copy_text(DEFAULT_PROMPTS.collection)}
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/20 p-4 text-sm leading-relaxed">
              <Streamdown>{DEFAULT_PROMPTS.collection}</Streamdown>
            </div>
          </CardContent>
        </Card>
      )}

      {templates_q.isPending ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading templates…</p>
      ) : templates_q.isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          Failed to load templates. {templates_q.error.message}
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {search ? `No templates match “${search}”.` : 'No templates yet — create one.'}
        </p>
      ) : (
        filtered.map((template) => (
          <Card
            key={template.id}
            id={`template-${template.id}`}
            className={highlighted_id === `template-${template.id}` ? 'ring-2 ring-primary' : ''}
          >
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">{template.title}</CardTitle>
                <CardDescription className="text-xs">
                  {template.subject === 'collection' ? 'Collection covers' : 'Puzzle cards'} · id{' '}
                  {template.id}
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => void copy_text(template.content)}>
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
            </CardHeader>
            <CardContent>
              {editing_id === template.id ? (
                <div className="space-y-3">
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
                      <Textarea
                        value={edit_content}
                        onChange={(e) => setEditContent(e.currentTarget.value)}
                        rows={14}
                        spellCheck={false}
                        className="font-mono text-xs"
                        placeholder="System prompt markdown…"
                      />
                    </TabsContent>
                    <TabsContent value="view">
                      <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/20 p-4 text-sm leading-relaxed">
                        {edit_content.trim() ? (
                          <Streamdown>{edit_content}</Streamdown>
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
                      disabled={update_mut.isPending}
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
                <div className="max-h-96 overflow-y-auto rounded-md border bg-muted/20 p-4 text-sm leading-relaxed">
                  {template.content.trim() ? (
                    <Streamdown>{template.content}</Streamdown>
                  ) : (
                    <p className="text-muted-foreground">
                      Empty template — click Edit to write the prompt.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
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
