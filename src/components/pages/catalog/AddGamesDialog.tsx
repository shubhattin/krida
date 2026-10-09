'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, XIcon } from 'lucide-react';
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { GameKindIcon, gameKindLabel } from '~/components/pages/catalog/GameKindIcon';
import { LanguageIcon } from '~/components/icons';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import Icon from '~/tools/Icon';
import type { GameKind } from '~/util/catalog/tags';

export type PickedGame = {
  game: GameKind;
  id: number;
  slug: string;
  title: string;
  description: string;
  listed: boolean;
  image: { s3_key: string } | null;
};

export function AddGamesDialog({
  open,
  onOpenChange,
  existingKeys,
  onAdd
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingKeys: Set<string>;
  onAdd: (picked: PickedGame[]) => void;
}) {
  const trpc = useTRPC();
  const [query, setQuery] = useState('');
  const [tagSlug, setTagSlug] = useState('');
  const [game, setGame] = useState<'all' | GameKind>('all');
  const [lipi, setLipi] = useState(false);
  const [picked, setPicked] = useState<PickedGame[]>([]);
  const typing = useMemo(() => createTypingContext('Devanagari'), []);
  const tags_q = useQuery(trpc.catalog.list_tags.queryOptions({ page: 1, size: 100 }));
  const results_q = useQuery(
    trpc.catalog.search_puzzles.queryOptions({
      query,
      tag_slug: tagSlug || undefined,
      game,
      limit: 40
    })
  );

  useEffect(() => {
    void typing.ready;
  }, [typing]);

  const pickedKeys = new Set(picked.map((item) => `${item.game}:${item.id}`));
  const results = (results_q.data ?? []).filter((puzzle) => {
    const key = `${puzzle.game}:${puzzle.id}`;
    return !existingKeys.has(key) && !pickedKeys.has(key);
  });

  const toggleLipiOnShortcut = (event: KeyboardEvent) => {
    if (
      event.altKey &&
      (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
    ) {
      event.preventDefault();
      setLipi((prev) => !prev);
      return true;
    }
    return false;
  };

  const toggle = (puzzle: PickedGame) => {
    setPicked((current) => {
      const key = `${puzzle.game}:${puzzle.id}`;
      if (current.some((item) => `${item.game}:${item.id}` === key)) {
        return current.filter((item) => `${item.game}:${item.id}` !== key);
      }
      return [...current, puzzle];
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPicked([]);
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-2xl"
        onKeyDown={(event) => {
          toggleLipiOnShortcut(event);
        }}
      >
        <DialogHeader>
          <DialogTitle>Add games</DialogTitle>
        </DialogHeader>
        <div className="max-h-28 overflow-y-auto rounded-lg border border-border/70 bg-muted/40 p-1.5">
          {picked.length === 0 ? (
            <p className="px-1.5 py-1 text-xs text-muted-foreground">
              Nothing selected. Click games below, then add them together.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {picked.map((item) => (
                <span
                  key={`${item.game}:${item.id}`}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-background px-1.5 py-0.5 text-xs shadow-sm"
                >
                  <GameKindIcon game={item.game} className="size-4" />
                  <span className="max-w-44 truncate">{item.title}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${item.title} from selection`}
                    onClick={() =>
                      setPicked((current) =>
                        current.filter(
                          (row) => `${row.game}:${row.id}` !== `${item.game}:${item.id}`
                        )
                      )
                    }
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              placeholder="Search title or description"
              onChange={(event) => setQuery(event.currentTarget.value)}
              onBeforeInput={(event) => handleTypingBeforeInputEvent(typing, event, setQuery, lipi)}
              onBlur={() => typing.clearContext()}
              onKeyDown={(event) => {
                if (
                  event.altKey &&
                  (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
                ) {
                  return;
                }
                clearTypingContextOnKeyDown(event, typing);
              }}
            />
          </InputGroup>
          <Label className="inline-flex items-center gap-1">
            <Switch checked={lipi} onCheckedChange={setLipi} aria-label="Lipi Lekhika" />
            <Icon src={LanguageIcon} className="size-5" />
          </Label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'padavali', 'crossword', 'dvayi', 'bhramita', 'surupa', 'anveshi'] as const).map(
            (value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={game === value ? 'secondary' : 'outline'}
                onClick={() => setGame(value)}
              >
                {value === 'all' ? 'All' : gameKindLabel(value)}
              </Button>
            )
          )}
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={tagSlug}
            onChange={(event) => setTagSlug(event.currentTarget.value)}
            aria-label="Filter by tag"
          >
            <option value="">Any tag</option>
            {(tags_q.data?.list ?? []).map((tag) => (
              <option key={tag.id} value={tag.slug}>
                {tag.slug}
              </option>
            ))}
          </select>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1">
            {results.map((puzzle) => (
              <button
                key={`${puzzle.game}-${puzzle.id}`}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted"
                onClick={() =>
                  toggle({
                    game: puzzle.game,
                    id: puzzle.id,
                    slug: puzzle.slug,
                    title: puzzle.title,
                    description: puzzle.description ?? '',
                    listed: puzzle.listed,
                    image: puzzle.image
                  })
                }
              >
                <GameKindIcon game={puzzle.game} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{puzzle.title}</span>
                  {puzzle.description ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {puzzle.description}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
            {results_q.isSuccess && results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matching games.</p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={picked.length === 0}
            onClick={() => {
              onAdd(picked);
              setPicked([]);
              onOpenChange(false);
              toast.success(
                picked.length === 1 ? 'Staged 1 game' : `Staged ${picked.length} games`
              );
            }}
          >
            {picked.length === 0 ? 'Add games' : `Add ${picked.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
