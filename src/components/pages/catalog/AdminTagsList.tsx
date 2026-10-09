'use client';

import { useEffect, useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDownIcon, FilterIcon, Plus, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '~/components/ui/accordion';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { cn } from '~/lib/utils';
import { normalizeTagSlug } from '~/util/catalog/tags';

const TAG_PAGE_SIZE = 24;

type TagSort = 'slug' | 'created_at' | 'count';
type TagOrder = 'asc' | 'desc';

type TagRow = {
  id: number;
  slug: string;
  padavali_count: number;
  crossword_count: number;
  total_count: number;
};

const SORT_ITEMS: { label: string; value: TagSort }[] = [
  { label: 'Slug', value: 'slug' },
  { label: 'Usage', value: 'count' },
  { label: 'Created', value: 'created_at' }
];

const ORDER_ITEMS: { label: string; value: TagOrder }[] = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' }
];

/** Shared admin tag browser — one list for every game. */
export function AdminTagsList() {
  const [page, setPage] = useState(1);
  const [unusedPage, setUnusedPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<TagSort>('slug');
  const [order, setOrder] = useState<TagOrder>('asc');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <InputGroup className="w-full sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
              setUnusedPage(1);
            }}
            placeholder="Search tags"
            aria-label="Search tags"
          />
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Sort field">
              <FilterIcon className="size-3.5 sm:size-4" />
            </Label>
            <Select
              items={SORT_ITEMS}
              value={sort}
              onValueChange={(value) => {
                if (!value) return;
                setSort(value);
                setPage(1);
                setUnusedPage(1);
              }}
            >
              <SelectTrigger size="sm" className="w-28 text-xs sm:text-sm" aria-label="Sort tags">
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={SORT_ITEMS} />
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Sort order">
              <ArrowUpDownIcon className="size-3.5 sm:size-4" />
            </Label>
            <Select
              items={ORDER_ITEMS}
              value={order}
              onValueChange={(value) => {
                if (!value) return;
                setOrder(value);
                setPage(1);
                setUnusedPage(1);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-32 text-xs sm:text-sm"
                aria-label="Tag sort order"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={ORDER_ITEMS} />
            </Select>
          </div>
        </div>
        <div className="ml-auto shrink-0">
          <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New tag
          </Button>
        </div>
      </div>
      <TagsListBody
        page={page}
        unusedPage={unusedPage}
        search={debouncedSearch || undefined}
        sort={sort}
        order={order}
        onPageChange={setPage}
        onUnusedPageChange={setUnusedPage}
      />
      <NewTagDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function SelectDropdown({ items }: { items: { label: string; value: string }[] }) {
  return (
    <SelectContent alignItemWithTrigger={false}>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

function TagsGrid({
  tags,
  unused
}: {
  tags: Pick<TagRow, 'id' | 'slug' | 'total_count'>[];
  unused?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {tags.map((tag) => (
        <Link
          key={tag.id}
          to="/tags/edit/$slug"
          params={{ slug: tag.slug }}
          className="rounded-xl border border-border/70 bg-card px-3 py-2 no-underline transition-colors hover:bg-muted/60"
        >
          <span className="block font-medium text-foreground">{tag.slug}</span>
          <span className="text-xs text-muted-foreground">
            {unused ? 'Unused' : `${tag.total_count} game${tag.total_count === 1 ? '' : 's'}`}
          </span>
        </Link>
      ))}
    </div>
  );
}

function TagsPagination({
  page,
  pageCount,
  hasPrev,
  hasNext,
  onPageChange
}: {
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Prev"
            onClick={(event) => {
              event.preventDefault();
              if (hasPrev) onPageChange(page - 1);
            }}
            className={cn(!hasPrev ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="px-2 text-sm text-muted-foreground">
            {page} / {pageCount}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
            text="Next"
            onClick={(event) => {
              event.preventDefault();
              if (hasNext) onPageChange(page + 1);
            }}
            className={cn(!hasNext ? 'pointer-events-none opacity-50' : undefined)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function AbandonedTagsSection({
  tags,
  total,
  search,
  page,
  pageCount,
  hasPrev,
  hasNext,
  loaded,
  onPageChange
}: {
  tags: TagRow[];
  total: number;
  search: string | undefined;
  page: number;
  pageCount: number;
  hasPrev: boolean;
  hasNext: boolean;
  loaded: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!loaded || total === 0) return null;

  return (
    <Accordion defaultValue={[]}>
      <AccordionItem value="abandoned-tags" className="rounded-xl border border-border px-3">
        <AccordionTrigger className="hover:no-underline">
          <span className="flex items-baseline gap-2">
            <span>Abandoned tags</span>
            <span className="text-xs font-normal text-muted-foreground">
              {total} unused{search ? ' matching search' : ''}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-3 pb-3">
            <TagsGrid tags={tags} unused />
            <TagsPagination
              page={page}
              pageCount={pageCount}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPageChange={onPageChange}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function TagsListBody({
  page,
  unusedPage,
  search,
  sort,
  order,
  onPageChange,
  onUnusedPageChange
}: {
  page: number;
  unusedPage: number;
  search: string | undefined;
  sort: TagSort;
  order: TagOrder;
  onPageChange: (page: number) => void;
  onUnusedPageChange: (page: number) => void;
}) {
  const trpc = useTRPC();
  const tags_q = useQuery(
    trpc.catalog.list_tags.queryOptions({
      page,
      size: TAG_PAGE_SIZE,
      search,
      sort,
      order,
      usage: 'used'
    })
  );
  const unused_q = useQuery(
    trpc.catalog.list_tags.queryOptions({
      page: unusedPage,
      size: TAG_PAGE_SIZE,
      search,
      sort,
      order,
      usage: 'unused'
    })
  );
  const tags = tags_q.data?.list ?? [];
  const unused = unused_q.data?.list ?? [];
  const unusedTotal = unused_q.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <TagsGrid tags={tags} />
        {tags.length === 0 && !tags_q.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {search
              ? 'No tags in use match your search.'
              : 'No tags in use yet. Create one or add them from a game editor.'}
          </p>
        ) : null}
        <TagsPagination
          page={page}
          pageCount={tags_q.data?.pageCount ?? 1}
          hasPrev={Boolean(tags_q.data?.hasPrev)}
          hasNext={Boolean(tags_q.data?.hasNext)}
          onPageChange={onPageChange}
        />
      </section>
      <AbandonedTagsSection
        tags={unused}
        total={unusedTotal}
        search={search}
        page={unusedPage}
        pageCount={unused_q.data?.pageCount ?? 1}
        hasPrev={Boolean(unused_q.data?.hasPrev)}
        hasNext={Boolean(unused_q.data?.hasNext)}
        loaded={unused_q.isSuccess}
        onPageChange={onUnusedPageChange}
      />
    </div>
  );
}

function NewTagDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState('');

  const create_mut = useMutation(
    trpc.catalog.create_tag.mutationOptions({
      onSuccess: async (created) => {
        toast.success('Tag created');
        onOpenChange(false);
        setSlug('');
        invalidateCatalogQueries(queryClient, trpc);
        await router.invalidate();
        await router.navigate({ to: '/tags/edit/$slug', params: { slug: created.slug } });
      },
      onError: (error) => {
        toast.error(error.message || 'Could not create tag');
      }
    })
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!create_mut.isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New tag</DialogTitle>
          <DialogDescription>
            Tags are shared across every game. You can attach games after the tag is created.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          <Label htmlFor="tag-slug">Tag</Label>
          <Input
            id="tag-slug"
            value={slug}
            onChange={(event) => setSlug(normalizeTagSlug(event.currentTarget.value))}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={!slug || create_mut.isPending}
            onClick={() => create_mut.mutate({ slug })}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
