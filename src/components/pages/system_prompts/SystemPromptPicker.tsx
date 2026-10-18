import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/api/client';
import {
  DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM,
  DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM_TITLE,
  DEFAULT_IMAGE_PROMPT_SYSTEM,
  DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE
} from '~/util/ai/image_prompt_defaults';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Eye, Pencil, RefreshCw } from 'lucide-react';
import { MarkdownView } from '~/components/ui/markdown-view';
import type { ImagePromptSubject } from '~/util/system_prompt_storage';

export type { ImagePromptSubject };

type SystemPromptPickerProps = {
  subject: ImagePromptSubject;
  /** null = built-in default; number = template id */
  selected_template_id: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
};

const DEFAULT_OPTION_VALUE = '__default__';

/**
 * System-prompt selector for image-prompt generation. Combines a select
 * (default + templates for the subject) with a "View" popover showing the
 * rendered prompt, an "Edit" deep link to the templates page, and a refresh
 * button. Used in both single and batch image flows.
 */
export function SystemPromptPicker({
  subject,
  selected_template_id,
  onChange,
  disabled = false
}: SystemPromptPickerProps) {
  const trpc = useTRPC();
  const [view_open, setViewOpen] = useState(false);

  const templates_q = useQuery(
    trpc.system_prompts.list.queryOptions({ subject }, { staleTime: 30_000 })
  );
  const templates = templates_q.data ?? [];

  const selected_template =
    selected_template_id != null
      ? (templates.find((t) => t.id === selected_template_id) ?? null)
      : null;
  /** Selected id missing from the subject-scoped list (deleted or other subject). */
  const selection_unavailable =
    selected_template_id != null && !templates_q.isPending && selected_template == null;
  const default_prompt =
    subject === 'collection' ? DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM : DEFAULT_IMAGE_PROMPT_SYSTEM;
  const default_title =
    subject === 'collection'
      ? DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM_TITLE
      : DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE;
  const preview_title = selected_template
    ? selected_template.title
    : selection_unavailable
      ? 'Template unavailable'
      : `${default_title} — ${subject === 'collection' ? 'collection covers' : 'puzzle cards'}`;

  const default_option_label = `${subject === 'collection' ? DEFAULT_COLLECTION_IMAGE_PROMPT_SYSTEM_TITLE : DEFAULT_IMAGE_PROMPT_SYSTEM_TITLE} — ${subject === 'collection' ? 'collection' : 'puzzle'}`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">Image system prompt</span>
      <div className="flex w-full items-center gap-1.5">
        <Select
          items={[
            { label: default_option_label, value: DEFAULT_OPTION_VALUE },
            ...templates.map((t) => ({ label: t.title, value: String(t.id) }))
          ]}
          value={selected_template_id != null ? String(selected_template_id) : DEFAULT_OPTION_VALUE}
          onValueChange={(value) => {
            if (!value) return;
            onChange(value === DEFAULT_OPTION_VALUE ? null : Number(value));
          }}
          disabled={disabled}
        >
          <SelectTrigger className="min-w-0 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_OPTION_VALUE}>{default_option_label}</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={view_open} onOpenChange={setViewOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                aria-label="View selected system prompt"
                disabled={disabled}
              />
            }
          >
            <Eye className="size-3.5" />
            View
          </PopoverTrigger>
          <PopoverContent className="w-96 max-w-[min(24rem,90vw)] space-y-2 p-3" align="start">
            <p className="text-xs font-semibold">{preview_title}</p>
            <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
              {selection_unavailable ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    This template is unavailable (deleted or for another image type). Generation
                    would fail — reset to the default.
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={() => onChange(null)}>
                    Reset to default
                  </Button>
                </div>
              ) : selected_template_id == null ? (
                <MarkdownView>{default_prompt}</MarkdownView>
              ) : selected_template?.content.trim() ? (
                <MarkdownView>{selected_template.content}</MarkdownView>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This template is empty — edit it on the System Prompts page.
                </p>
              )}
            </div>
            {selected_template_id != null ? (
              <a
                href={`/system-prompts#template-${selected_template_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Pencil className="size-3" />
                Edit template
              </a>
            ) : (
              <a
                href="/system-prompts"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Pencil className="size-3" />
                Manage templates
              </a>
            )}
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          title="Refresh template list"
          aria-label="Refresh template list"
          disabled={templates_q.isFetching}
          onClick={() => void templates_q.refetch()}
        >
          <RefreshCw className={`size-3.5 ${templates_q.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
