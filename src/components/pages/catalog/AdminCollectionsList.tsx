'use client';

import { useMemo, useState } from 'react';
import { Image } from '@unpic/react';
import { Link, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
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
import { Textarea } from '~/components/ui/textarea';
import { getCDNUrl } from '~/constants';
import { normalizeTagSlug } from '~/util/catalog/tags';

/** Shared admin collections browser — one list for every game. */
export function AdminCollectionsList() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center gap-2">
        <InputGroup className="min-w-0 flex-1 sm:max-w-sm">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search title, slug, or description"
            aria-label="Search collections"
          />
        </InputGroup>
        <div className="ml-auto shrink-0">
          <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New collection
          </Button>
        </div>
      </div>
      <CollectionsGrid search={search.trim().toLowerCase()} />
      <NewCollectionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CollectionsGrid({ search }: { search: string }) {
  const trpc = useTRPC();
  const collections_q = useQuery(trpc.catalog.list_collections.queryOptions());

  const visible = useMemo(() => {
    const rows = collections_q.data ?? [];
    if (!search) return rows;
    return rows.filter(
      (collection) =>
        collection.title.toLowerCase().includes(search) ||
        collection.slug.includes(search) ||
        collection.description.toLowerCase().includes(search)
    );
  }, [collections_q.data, search]);

  if (collections_q.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading collections…</p>;
  }
  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {search ? 'No collections match your search.' : 'No collections yet.'}
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
