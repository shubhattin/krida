'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, CopyIcon, DownloadIcon, EllipsisIcon, FileTextIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '~/api/client';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Skeleton } from '~/components/ui/skeleton';
import { formatPuzzlesFullText } from '~/util/catalog/puzzle_full_text';
import type { GameKind } from '~/util/catalog/tags';
import { gameKindLabel } from '~/util/games/labels';
import type { AdminPuzzleRow } from './puzzle_table_columns';

/** "⋯" menu for the full list; each option acts on every loaded puzzle. */
export function FullListActions({ game, puzzles }: { game: GameKind; puzzles: AdminPuzzleRow[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" size="icon-sm" />}
          aria-label="List actions"
          title="List actions"
        >
          <EllipsisIcon />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 gap-0.5 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              setMenuOpen(false);
              setTextOpen(true);
            }}
          >
            <FileTextIcon />
            Get Full TXT
          </Button>
        </PopoverContent>
      </Popover>
      <FullTextDialog game={game} puzzles={puzzles} open={textOpen} onOpenChange={setTextOpen} />
    </>
  );
}

function FullTextDialog({
  game,
  puzzles,
  open,
  onOpenChange
}: {
  game: GameKind;
  puzzles: AdminPuzzleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const [copied, setCopied] = useState(false);
  const puzzle_ids = useMemo(() => puzzles.map((puzzle) => puzzle.id), [puzzles]);
  const entries_q = useQuery({
    ...trpc.catalog.puzzle_entries_batch.queryOptions({ game, puzzle_ids }),
    enabled: open && puzzle_ids.length > 0
  });

  const text = useMemo(
    () => (entries_q.data ? formatPuzzlesFullText(puzzles, entries_q.data) : ''),
    [puzzles, entries_q.data]
  );
  const fileName = `${gameKindLabel(game)} List.txt`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{gameKindLabel(game)} — full list</DialogTitle>
          <DialogDescription>
            {puzzles.length} puzzle{puzzles.length === 1 ? '' : 's'} with their tags, collections
            and content.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!text}
            onClick={() => void copy()}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button type="button" size="sm" disabled={!text} onClick={download}>
            <DownloadIcon />
            Download
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-muted/30">
          {entries_q.isLoading ? (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
          ) : entries_q.isError ? (
            <p className="p-3 text-sm text-muted-foreground">Could not load puzzle content.</p>
          ) : (
            <pre className="p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{text}</pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
