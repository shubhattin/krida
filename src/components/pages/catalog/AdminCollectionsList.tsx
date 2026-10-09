'use client';

import { useEffect, useMemo, useState } from 'react';
import { Image } from '@unpic/react';
import { Link, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDownIcon, FilterIcon, List, Plus, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { useTRPC } from '~/api/client';
import { LanguageIcon } from '~/components/icons';
import { invalidateCatalogQueries } from '~/components/pages/catalog/invalidateCatalogQueries';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { getCDNUrl } from '~/constants';
import Icon from '~/tools/Icon';
import { normalizeTagSlug } from '~/util/catalog/tags';

type ListedFilter = 'all' | 'listed' | 'unlisted';
type CollectionSort = 'created_at' | 'title' | 'item_count' | 'listed';
type SortOrder = 'asc' | 'desc';

const LISTED_FILTER_ITEMS: { label: string; value: ListedFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Listed', value: 'listed' },
  { label: 'Unlisted', value: 'unlisted' }
];

const SORT_ITEMS: { label: string; value: CollectionSort }[] = [
  { label: 'Created', value: 'created_at' },
  { label: 'Title', value: 'title' },
  { label: 'Games', value: 'item_count' },
  { label: 'Listed', value: 'listed' }
];

const ORDER_ITEMS: { label: string; value: SortOrder }[] = [
  { label: 'Descending', value: 'desc' },
  { label: 'Ascending', value: 'asc' }
];

function useDevanagariTyping() {
  const ctx = useMemo(() => createTypingContext('Devanagari'), []);

  useEffect(() => {
    void ctx.ready;
  }, [ctx]);

  return ctx;
}

/** Shared admin collections browser — one list for every game. */
export function AdminCollectionsList() {
  const [search, setSearch] = useState('');
  const [lipiLekhikaTyping, setLipiLekhikaTyping] = useState(false);
  const [listedFilter, setListedFilter] = useState<ListedFilter>('all');
  const [sortBy, setSortBy] = useState<CollectionSort>('created_at');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const ctx = useDevanagariTyping();

  const toggleLipiOnShortcut = (event: React.KeyboardEvent) => {
    if (
      event.altKey &&
      (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault();
      setLipiLekhikaTyping((prev) => !prev);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-row items-center gap-2">
          <InputGroup className="min-w-0 flex-1 sm:max-w-sm">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              onBeforeInput={(event) =>
                handleTypingBeforeInputEvent(ctx, event, setSearch, lipiLekhikaTyping)
              }
              onBlur={() => ctx.clearContext()}
              onKeyDown={(event) => {
                if (toggleLipiOnShortcut(event)) return;
                clearTypingContextOnKeyDown(event, ctx);
              }}
              placeholder="Search title, slug, or description"
              aria-label="Search collections"
            />
          </InputGroup>
          <Label className="inline-flex shrink-0 items-center gap-1.5">
            <Switch
              checked={lipiLekhikaTyping}
              onCheckedChange={setLipiLekhikaTyping}
              className="scale-90"
              aria-label="Lipi Lekhika typing mode"
            />
            <Icon src={LanguageIcon} className="size-5" />
          </Label>
          <div className="ml-auto shrink-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New collection
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Listed filter">
              <List className="size-3.5 sm:size-4" />
            </Label>
            <Select
              items={LISTED_FILTER_ITEMS}
              value={listedFilter}
              onValueChange={(value) => {
                if (value) setListedFilter(value);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-24 text-xs sm:text-sm"
                aria-label="Listed filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={LISTED_FILTER_ITEMS} />
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="px-1 text-xs font-semibold sm:text-sm" title="Sort field">
              <FilterIcon className="size-3.5 sm:size-4" />
            </Label>
            <Select
              items={SORT_ITEMS}
              value={sortBy}
              onValueChange={(value) => {
                if (value) setSortBy(value);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-28 text-xs sm:text-sm"
                aria-label="Sort collections"
              >
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
                if (value) setOrder(value);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-32 text-xs sm:text-sm"
                aria-label="Collection sort order"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectDropdown items={ORDER_ITEMS} />
            </Select>
          </div>
        </div>
      </div>
      <CollectionsGrid
        search={search.trim().toLowerCase()}
        listedFilter={listedFilter}
        sortBy={sortBy}
        order={order}
      />
      <NewCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
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

function CollectionsGrid({
  search,
  listedFilter,
  sortBy,
  order
}: {
  search: string;
  listedFilter: ListedFilter;
  sortBy: CollectionSort;
  order: SortOrder;
}) {
  const trpc = useTRPC();
  const collections_q = useQuery(trpc.catalog.list_collections.queryOptions());

  const visible = useMemo(() => {
    const rows = collections_q.data ?? [];
    const filtered = rows.filter((collection) => {
      if (listedFilter === 'listed' && !collection.listed) return false;
      if (listedFilter === 'unlisted' && collection.listed) return false;
      if (!search) return true;
      return (
        collection.title.toLowerCase().includes(search) ||
        collection.slug.toLowerCase().includes(search) ||
        collection.description.toLowerCase().includes(search)
      );
    });
    const dir = order === 'asc' ? 1 : -1;
    return filtered.toSorted((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === 'item_count') {
        cmp = a.item_count - b.item_count;
      } else if (sortBy === 'listed') {
        cmp = Number(a.listed) - Number(b.listed);
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (cmp !== 0) return cmp * dir;
      return a.title.localeCompare(b.title);
    });
  }, [collections_q.data, listedFilter, order, search, sortBy]);

  if (collections_q.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading collections…</p>;
  }
  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {search || listedFilter !== 'all'
          ? 'No collections match your filters.'
          : 'No collections yet.'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((collection) => (
        <Link
          key={collection.id}
          to="/collections/edit/$uid"
          params={{ uid: collection.uid }}
          className="no-underline"
        >
          <Card className="h-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <CardHeader className="gap-2">
              <div className="flex items-start gap-3">
                {collection.image ? (
                  <Image
                    src={getCDNUrl(collection.image.s3_key)}
                    alt=""
                    width={96}
                    height={64}
                    className="h-16 w-24 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-16 w-24 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{collection.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {collection.description || 'No description'}
                  </CardDescription>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {collection.item_count} game{collection.item_count === 1 ? '' : 's'}
                {collection.listed ? '' : ' · unlisted'}
              </span>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function NewCollectionDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [lipiLekhikaTyping, setLipiLekhikaTyping] = useState(false);
  const titleCtx = useDevanagariTyping();
  const descriptionCtx = useDevanagariTyping();

  const create_mut = useMutation(
    trpc.catalog.create_collection.mutationOptions({
      onSuccess: async (created) => {
        toast.success('Collection created');
        onOpenChange(false);
        setTitle('');
        setSlug('');
        setDescription('');
        invalidateCatalogQueries(queryClient, trpc);
        await router.invalidate();
        await router.navigate({ to: '/collections/edit/$uid', params: { uid: created.uid } });
      },
      onError: (error) => {
        toast.error(error.message || 'Could not create collection');
      }
    })
  );

  const toggleLipiOnShortcut = (event: React.KeyboardEvent) => {
    if (
      event.altKey &&
      (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault();
      setLipiLekhikaTyping((prev) => !prev);
      return true;
    }
    return false;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!create_mut.isPending) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
          <DialogDescription>
            A collection is a hand-picked list. You can add Padavali and Padajala games after it is
            created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-end">
            <Label className="inline-flex items-center gap-1.5">
              <Switch
                checked={lipiLekhikaTyping}
                onCheckedChange={setLipiLekhikaTyping}
                className="scale-90"
                aria-label="Lipi Lekhika typing mode"
              />
              <Icon src={LanguageIcon} className="size-5" />
            </Label>
          </div>
          <div className="space-y-1">
            <Label htmlFor="collection-title">Title</Label>
            <Input
              id="collection-title"
              value={title}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setTitle(next);
                if (!slug || slug === normalizeTagSlug(title)) setSlug(normalizeTagSlug(next));
              }}
              onBeforeInput={(event) =>
                handleTypingBeforeInputEvent(
                  titleCtx,
                  event,
                  (next) => {
                    setTitle(next);
                    if (!slug || slug === normalizeTagSlug(title)) setSlug(normalizeTagSlug(next));
                  },
                  lipiLekhikaTyping
                )
              }
              onBlur={() => titleCtx.clearContext()}
              onKeyDown={(event) => {
                if (toggleLipiOnShortcut(event)) return;
                clearTypingContextOnKeyDown(event, titleCtx);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="collection-slug">Slug</Label>
            <Input
              id="collection-slug"
              value={slug}
              onChange={(event) => setSlug(normalizeTagSlug(event.currentTarget.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="collection-description">Description</Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              onBeforeInput={(event) =>
                handleTypingBeforeInputEvent(
                  descriptionCtx,
                  event,
                  setDescription,
                  lipiLekhikaTyping
                )
              }
              onBlur={() => descriptionCtx.clearContext()}
              onKeyDown={(event) => {
                if (toggleLipiOnShortcut(event)) return;
                clearTypingContextOnKeyDown(event, descriptionCtx);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={!title.trim() || !slug || create_mut.isPending}
            onClick={() =>
              create_mut.mutate({
                title: title.trim(),
                slug,
                description: description.trim()
              })
            }
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
