'use client';

import { Image } from '@unpic/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ImageIcon,
  Plus,
  X,
  RefreshCw,
  Wand2,
  SearchIcon,
  MoreVertical,
  ArrowUpDownIcon,
  CircleHelp
} from 'lucide-react';
import { MdDeleteOutline } from 'react-icons/md';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
import { Progress } from '~/components/ui/progress';
import { Skeleton } from '~/components/ui/skeleton';
import { Textarea } from '~/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectItem,
  SelectContent
} from '~/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '~/components/ui/pagination';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, useTRPC } from '~/api/client';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import { BatchPuzzleImageCostNote } from '~/components/pages/padavali/batch-image/BatchPuzzleImageCostNote';
import { BatchPuzzleImageReviewDialog } from '~/components/pages/padavali/batch-image/BatchPuzzleImageReviewDialog';
import { BatchPuzzleImageStatus } from '~/components/pages/padavali/batch-image/BatchPuzzleImageStatus';
import {
  useInvalidatePuzzleImageBatchQueries,
  usePuzzleImageBatchStatus
} from '~/components/pages/padavali/batch-image/usePuzzleImageBatchStatus';
import type { PuzzleImageGame } from '~/util/types/ai_batch_metadata';

const IMAGE_ASPECT = '768 / 512';
const IMAGE_GENERATION_TIMEOUT_MS = 60_000;

export type PuzzleImageInfo = { id: number; s3_key: string; width: number; height: number };

export type PuzzleCardImageSectionProps = {
  puzzleId: number;
  game: PuzzleImageGame;
  title: string;
  description: string;
  words: string[];
  imageId: number | null;
  imageInfo: PuzzleImageInfo | null;
  onImageIdChange: (id: number | null) => void;
  onImageInfoChange: (info: PuzzleImageInfo | null) => void;
  onImageBaselineChange: (id: number | null) => void;
};

export function PuzzleCardImageSection({
  puzzleId,
  game,
  title,
  description,
  words,
  imageId: image_id,
  imageInfo: image_info,
  onImageIdChange: setImageId,
  onImageInfoChange: setImageInfo,
  onImageBaselineChange: setImageBaseline
}: PuzzleCardImageSectionProps) {
  const [dialog_open, setDialogOpen] = useState(false);
  const [review_open, setReviewOpen] = useState(false);

  const batch_status_q = usePuzzleImageBatchStatus(puzzleId, true, game);
  const batch_status = batch_status_q.data ?? null;

  const handleClearImage = () => {
    setImageId(null);
    setImageInfo(null);
  };

  const handleImageAdded = (info: {
    id: number;
    s3_key: string;
    width: number;
    height: number;
  }) => {
    setImageId(info.id);
    setImageInfo(info);
    setDialogOpen(false);
  };

  const handleBatchImageApproved = (info: {
    id: number;
    s3_key: string;
    width: number;
    height: number;
  }) => {
    setImageId(info.id);
    setImageInfo(info);
    setImageBaseline(info.id);
    setReviewOpen(false);
  };

  useEffect(() => {
    if (!batch_status?.image_asset || batch_status.metadata.success !== true) {
      return;
    }

    const asset = batch_status.image_asset;
    const next_image = {
      id: asset.id,
      s3_key: asset.s3_key,
      width: asset.width,
      height: asset.height
    };

    if (batch_status.auto_approved || batch_status.status === 'auto_applying') {
      if (image_id !== next_image.id || image_info?.s3_key !== next_image.s3_key) {
        setImageId(next_image.id);
        setImageInfo(next_image);
        setImageBaseline(next_image.id);
      }
    }
  }, [batch_status, image_id, image_info, setImageId, setImageInfo, setImageBaseline]);

  const show_batch_status =
    batch_status !== null &&
    (batch_status.status === 'processing' ||
      batch_status.status === 'failed' ||
      batch_status.status === 'ready_for_review' ||
      batch_status.status === 'auto_applying');

  return (
    <div className="space-y-3">
      <span className="text-lg font-bold">Puzzle Image</span>

      {show_batch_status && batch_status ? (
        <div className="space-y-2">
          <BatchPuzzleImageStatus
            status={batch_status}
            onRefresh={() => void batch_status_q.refetch()}
            isRefreshing={batch_status_q.isFetching}
          />
          {batch_status.status === 'ready_for_review' ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setReviewOpen(true)}>
              Review generated image
            </Button>
          ) : null}
        </div>
      ) : null}

      {batch_status && batch_status.status === 'ready_for_review' ? (
        <BatchPuzzleImageReviewDialog
          open={review_open}
          onOpenChange={setReviewOpen}
          batchStatus={batch_status}
          onApproved={handleBatchImageApproved}
        />
      ) : null}

      {image_info ? (
        <div className="flex flex-col items-start gap-3">
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-lg border border-border shadow-sm"
            style={{ aspectRatio: IMAGE_ASPECT }}
          >
            <Image
              src={getCDNUrl(image_info.s3_key)}
              alt="Puzzle card image"
              width={768}
              height={512}
              className="block h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={dialog_open} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <ImageIcon className="size-4" />
                Manage Image
              </DialogTrigger>
              <AIImageDialogContent
                puzzle_id={puzzleId}
                game={game}
                title={title}
                description={description}
                words={words}
                existing_image={image_info}
                onImageAdded={handleImageAdded}
                onImageCleared={handleClearImage}
              />
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleClearImage}
            >
              <X className="size-4" />
              Remove Image
            </Button>
          </div>
        </div>
      ) : (
        <Dialog open={dialog_open} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus className="size-4" />
            Add Image
          </DialogTrigger>
          <AIImageDialogContent
            puzzle_id={puzzleId}
            game={game}
            title={title}
            description={description}
            words={words}
            existing_image={null}
            onImageAdded={handleImageAdded}
            onImageCleared={handleClearImage}
          />
        </Dialog>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Image Dialog — content
// ---------------------------------------------------------------------------

type ImageInfo = { id: number; s3_key: string; width: number; height: number };

type ImageAssetListItem = ImageInfo & {
  description: string | null;
  created_at: Date;
};

type GenerationPhase =
  | { state: 'idle' }
  | { state: 'generating' }
  | { state: 'done'; image_prompt: string; image_info: ImageInfo };

type ImageDialogTab = 'create-new' | 'existing';

const IMAGE_ASSETS_LIST_QUERY_KEY = 'image_assets_list' as const;
const IMAGE_ASSETS_PAGE_SIZE = 6;

const IMAGE_ORDER_ITEMS = [
  { label: 'Latest', value: 'desc' as const },
  { label: 'Oldest', value: 'asc' as const }
];

function getVisiblePages(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }

  return result;
}

function toImageInfo(
  item: Pick<ImageAssetListItem, 'id' | 's3_key' | 'width' | 'height'>
): ImageInfo {
  return {
    id: item.id,
    s3_key: item.s3_key,
    width: item.width,
    height: item.height
  };
}

/** Linear progress from 0→90 over the timeout duration, then frozen at 90 until done */
const useGenerationProgress = (active: boolean) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) return;
    const TARGET = 90;
    const INTERVAL = 150;
    const step = (TARGET / IMAGE_GENERATION_TIMEOUT_MS) * INTERVAL;
    let current = 0;
    const resetFrame = requestAnimationFrame(() => setProgress(0));
    const id = setInterval(() => {
      current = Math.min(current + step, TARGET);
      setProgress(current);
      if (current >= TARGET) clearInterval(id);
    }, INTERVAL);
    return () => {
      cancelAnimationFrame(resetFrame);
      clearInterval(id);
    };
  }, [active]);

  return active ? progress : 0;
};

const ExistingImageCard = ({
  image,
  selected,
  onSelect,
  onDeleted
}: {
  image: ImageAssetListItem;
  selected: boolean;
  onSelect: (info: ImageInfo | null) => void;
  onDeleted: (id: number) => void;
}) => {
  const [delete_open, setDeleteOpen] = useState(false);
  const [menu_open, setMenuOpen] = useState(false);
  const trpc = useTRPC();

  const delete_mut = useMutation(
    trpc.image_assets.delete_image_asset.mutationOptions({
      onSuccess: (data) => {
        if (data.deleted) {
          toast.success('Image deleted');
          onDeleted(image.id);
        } else {
          toast.error('Image not found');
        }
        setDeleteOpen(false);
      },
      onError: () => {
        toast.error('Failed to delete image');
        setDeleteOpen(false);
      }
    })
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onSelect(selected ? null : toImageInfo(image))}
        className={cn(
          'relative w-full overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-colors',
          selected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50'
        )}
        style={{ aspectRatio: IMAGE_ASPECT }}
      >
        <Image
          src={getCDNUrl(image.s3_key)}
          alt={image.description ?? 'Image asset'}
          width={768}
          height={512}
          className="block w-full object-cover"
        />
        {image.description ? (
          <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{image.description}</p>
        ) : null}
      </button>

      <Popover open={menu_open} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="secondary"
              size="icon-sm"
              className="absolute top-1.5 right-1.5 size-7 bg-background/90 shadow-sm"
              aria-label="Image actions"
            />
          }
        >
          <MoreVertical className="size-4" />
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="end">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
          >
            <MdDeleteOutline className="size-4" />
            Delete
          </Button>
        </PopoverContent>
      </Popover>

      <AlertDialog open={delete_open} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the image from storage. Puzzles already using it will lose
              their image reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delete_mut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={delete_mut.isPending}
              onClick={(e) => {
                e.preventDefault();
                delete_mut.mutate({ id: image.id });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ImageSearchBar({
  searchDescription,
  onSearchChange,
  orderBy,
  onOrderChange
}: {
  searchDescription: string;
  onSearchChange: (value: string) => void;
  orderBy: 'asc' | 'desc';
  onOrderChange: (value: 'asc' | 'desc') => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <InputGroup className="w-full flex-1">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          className="text-sm"
          value={searchDescription}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          placeholder="Search by description…"
        />
      </InputGroup>
      <Select
        items={IMAGE_ORDER_ITEMS}
        value={orderBy}
        onValueChange={(value) => {
          if (value) onOrderChange(value);
        }}
      >
        <SelectTrigger size="sm" className="w-full sm:w-32" aria-label="Sort order">
          <ArrowUpDownIcon className="size-3.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {IMAGE_ORDER_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ImageGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: IMAGE_ASSETS_PAGE_SIZE }).map((_, index) => (
        <Skeleton key={index} className="rounded-lg" style={{ aspectRatio: IMAGE_ASPECT }} />
      ))}
    </div>
  );
}

function ExistingImageGrid({
  images,
  selected_image_id,
  onSelect,
  onDeleted
}: {
  images: ImageAssetListItem[];
  selected_image_id: number | null;
  onSelect: (info: ImageInfo | null) => void;
  onDeleted: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((image) => (
        <ExistingImageCard
          key={image.id}
          image={image}
          selected={selected_image_id === image.id}
          onSelect={(info) => onSelect(info)}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  );
}

function EmptyImageState({ isFetching }: { isFetching: boolean }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground"
      style={{ minHeight: 120 }}
    >
      {isFetching ? 'Loading…' : 'No images found'}
    </div>
  );
}

function ImagePagination({
  page,
  pageCount,
  total,
  hasPrev,
  hasNext,
  isFetching,
  onPageChange
}: {
  page: number;
  pageCount: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  isFetching: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!(pageCount > 1 || total > 0)) return null;

  const prevDisabled = !hasPrev || isFetching;
  const nextDisabled = !hasNext || isFetching;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Prev"
            onClick={(e) => {
              e.preventDefault();
              if (!prevDisabled) onPageChange(page - 1);
            }}
            aria-disabled={prevDisabled}
            className={cn(prevDisabled && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>
        {getVisiblePages(page, pageCount).map((pageNumber, index) =>
          pageNumber === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                isActive={pageNumber === page}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFetching) onPageChange(pageNumber);
                }}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!nextDisabled) onPageChange(page + 1);
            }}
            aria-disabled={nextDisabled}
            className={cn(nextDisabled && 'pointer-events-none opacity-50')}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

const ExistingImageTab = ({
  enabled,
  selected_image_id,
  onSelect,
  onImageDeleted
}: {
  enabled: boolean;
  selected_image_id: number | null;
  onSelect: (info: ImageInfo | null) => void;
  onImageDeleted: (id: number) => void;
}) => {
  const [page, setPage] = useState(1);
  const [search_description, setSearchDescription] = useState('');
  const [debounced_search, setDebouncedSearch] = useState('');
  const [order_by, setOrderBy] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search_description), 400);
    return () => clearTimeout(timeoutId);
  }, [search_description]);

  const image_assets_q = useQuery({
    queryKey: [IMAGE_ASSETS_LIST_QUERY_KEY, page, debounced_search, order_by],
    queryFn: async () =>
      client.image_assets.get_image_assets_page.query({
        page,
        size: IMAGE_ASSETS_PAGE_SIZE,
        search_description: debounced_search || undefined,
        order_by
      }),
    enabled,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false
  });

  const images = image_assets_q.data?.list ?? [];
  const pageCount = image_assets_q.data?.pageCount ?? 1;
  const hasPrev = image_assets_q.data?.hasPrev ?? false;
  const hasNext = image_assets_q.data?.hasNext ?? false;
  const isInitialLoading = image_assets_q.isLoading && !image_assets_q.data;

  const handleDeleted = (id: number) => {
    onImageDeleted(id);
    void image_assets_q.refetch();
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <ImageSearchBar
        searchDescription={search_description}
        onSearchChange={(value) => {
          setSearchDescription(value);
          setPage(1);
        }}
        orderBy={order_by}
        onOrderChange={(value) => {
          setOrderBy(value);
          setPage(1);
        }}
      />

      {isInitialLoading ? (
        <ImageGridSkeleton />
      ) : images.length > 0 ? (
        <ExistingImageGrid
          images={images}
          selected_image_id={selected_image_id}
          onSelect={onSelect}
          onDeleted={handleDeleted}
        />
      ) : (
        <EmptyImageState isFetching={image_assets_q.isFetching} />
      )}

      <ImagePagination
        page={page}
        pageCount={pageCount}
        total={image_assets_q.data?.total ?? 0}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isFetching={image_assets_q.isFetching}
        onPageChange={setPage}
      />
    </div>
  );
};

const CreateNewImageTab = ({
  phase,
  custom_prompt,
  setCustomPrompt,
  progress,
  isWorking,
  onStartGeneration,
  onDelete,
  onDeleteAndRegenerate,
  onMakeImage,
  auto_approved,
  onAutoApprovedChange,
  onGenerateInBackground,
  isBatchQueuing,
  include_word_meanings,
  onIncludeWordMeaningsChange,
  include_custom_instructions,
  onIncludeCustomInstructionsChange,
  custom_instructions,
  onCustomInstructionsChange
}: {
  phase: GenerationPhase;
  custom_prompt: string;
  setCustomPrompt: (value: string) => void;
  progress: number;
  isWorking: boolean;
  onStartGeneration: () => void;
  onDelete: () => void;
  onDeleteAndRegenerate: () => void;
  onMakeImage: () => void;
  auto_approved: boolean;
  onAutoApprovedChange: (checked: boolean) => void;
  onGenerateInBackground: () => void;
  isBatchQueuing: boolean;
  include_word_meanings: boolean;
  onIncludeWordMeaningsChange: (checked: boolean) => void;
  include_custom_instructions: boolean;
  onIncludeCustomInstructionsChange: (checked: boolean) => void;
  custom_instructions: string;
  onCustomInstructionsChange: (value: string) => void;
}) => {
  const batch_disabled = isWorking || isBatchQueuing;

  return (
    <div className="flex flex-col items-center gap-4 py-1">
      {phase.state === 'idle' && (
        <div className="flex w-full flex-col items-center gap-4">
          <div
            className="flex w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-border bg-muted/30"
            style={{ aspectRatio: IMAGE_ASPECT }}
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="size-10 opacity-40" />
              <span className="text-sm">No image yet</span>
            </div>
          </div>
          <div className="w-full max-w-sm space-y-2.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={include_word_meanings}
                    onCheckedChange={(checked) => onIncludeWordMeaningsChange(checked === true)}
                    disabled={isWorking}
                  />
                  Include word meanings
                </label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="About include word meanings"
                      />
                    }
                  >
                    <CircleHelp className="size-3.5" />
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2.5 text-xs leading-snug" align="start">
                    May make the image give away too much of the puzzle theme.
                  </PopoverContent>
                </Popover>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={include_custom_instructions}
                  onCheckedChange={(checked) => onIncludeCustomInstructionsChange(checked === true)}
                  disabled={isWorking}
                />
                Custom instructions
              </label>
            </div>
            {include_custom_instructions ? (
              <Textarea
                rows={2}
                className="min-h-0 w-full resize-none text-xs"
                value={custom_instructions}
                onChange={(e) => onCustomInstructionsChange(e.currentTarget.value)}
                placeholder="Optional guidance for the image prompt…"
                disabled={isWorking}
              />
            ) : null}
          </div>
          <Button onClick={onStartGeneration} disabled={isWorking} className="gap-2">
            <Wand2 className="size-4" />
            Create AI Image
          </Button>
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Cheaper background generation</p>
              <BatchPuzzleImageCostNote />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={auto_approved}
                onCheckedChange={(checked) => onAutoApprovedChange(checked === true)}
              />
              Auto apply generated image to puzzle
            </label>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={batch_disabled}
              onClick={onGenerateInBackground}
            >
              <RefreshCw className={isBatchQueuing ? 'size-4 animate-spin' : 'size-4'} />
              Generate in Background
            </Button>
          </div>
        </div>
      )}

      {phase.state === 'generating' && (
        <div className="flex w-full flex-col items-center gap-3">
          <Skeleton className="w-full max-w-sm rounded-lg" style={{ aspectRatio: IMAGE_ASPECT }} />
          <div className="w-full max-w-sm">
            <Progress value={progress} className="w-full" />
          </div>
        </div>
      )}

      {phase.state === 'done' && (
        <div className="flex w-full flex-col items-center gap-4">
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-lg border border-border shadow"
            style={{ aspectRatio: IMAGE_ASPECT }}
          >
            <Image
              src={getCDNUrl(phase.image_info.s3_key)}
              alt="Generated puzzle card"
              width={768}
              height={512}
              className="block h-full w-full object-cover"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" disabled={isWorking} onClick={onDelete}>
              <MdDeleteOutline className="size-4" />
              Delete Image
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isWorking}
              onClick={onDeleteAndRegenerate}
            >
              <RefreshCw className="size-4" />
              Remake Image
            </Button>
          </div>

          <div className="w-full space-y-2">
            <p className="text-sm font-semibold">Edit Image Prompt</p>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Image Prompt</span>
              <Textarea
                className="min-h-25 w-full resize-y text-sm"
                value={custom_prompt}
                onChange={(e) => setCustomPrompt(e.currentTarget.value)}
                placeholder="Edit the image prompt…"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={isWorking || !custom_prompt.trim()} onClick={onMakeImage}>
                <Wand2 className="size-4" />
                Regenerate from Prompt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function AIImageDialogContent({
  puzzle_id,
  game,
  title,
  description,
  words,
  existing_image,
  onImageAdded,
  onImageCleared
}: {
  puzzle_id: number;
  game: PuzzleImageGame;
  title: string;
  description: string;
  words: string[];
  existing_image: ImageInfo | null;
  onImageAdded: (info: ImageInfo) => void;
  onImageCleared: () => void;
}) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { invalidateAll } = useInvalidatePuzzleImageBatchQueries(game);
  const [active_tab, setActiveTab] = useState<ImageDialogTab>('create-new');
  const [auto_approved, setAutoApproved] = useState(true);
  const [phase, setPhase] = useState<GenerationPhase>(
    existing_image
      ? { state: 'done', image_prompt: '', image_info: existing_image }
      : { state: 'idle' }
  );
  const [custom_prompt, setCustomPrompt] = useState('');
  const [selected_image, setSelectedImage] = useState<ImageInfo | null>(existing_image);
  const [include_word_meanings, setIncludeWordMeanings] = useState(false);
  const [include_custom_instructions, setIncludeCustomInstructions] = useState(false);
  const [custom_instructions, setCustomInstructions] = useState('');

  const progress = useGenerationProgress(phase.state === 'generating');

  const buildOptionalPromptContext = () => {
    const trimmed_extra = custom_instructions.trim();
    return {
      // `undefined` properties are treated as absent by the optional Zod input fields.
      words: include_word_meanings && words.length > 0 ? words : undefined,
      extra_instructions:
        include_custom_instructions && trimmed_extra.length > 0 ? trimmed_extra : undefined
    };
  };

  const invalidateImageAssetsList = () => {
    void queryClient.invalidateQueries({ queryKey: [IMAGE_ASSETS_LIST_QUERY_KEY] });
  };

  const generate_mut = useMutation(
    trpc.ai_image_gen.generate_puzzle_card_image.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          const image_info = { id: data.id, s3_key: data.s3_key, width: 768, height: 512 };
          setPhase({
            state: 'done',
            image_prompt: data.image_prompt,
            image_info
          });
          setCustomPrompt(data.image_prompt);
          setSelectedImage(image_info);
          invalidateImageAssetsList();
        } else {
          toast.error(`Image generation failed: ${data.err_code}`);
          setPhase({ state: 'idle' });
        }
      },
      onError: () => {
        toast.error('Image generation failed');
        setPhase({ state: 'idle' });
      }
    })
  );

  const delete_mut = useMutation(
    trpc.image_assets.delete_image_asset.mutationOptions({
      onSuccess: () => {
        setPhase({ state: 'idle' });
        setCustomPrompt('');
        setSelectedImage(null);
        onImageCleared();
        invalidateImageAssetsList();
      },
      onError: () => toast.error('Failed to delete image')
    })
  );

  const batch_trigger_mut = useMutation(
    trpc.batch_ai.trigger_batch_puzzle_image_gen.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateAll(puzzle_id);
        if (variables.auto_approved) {
          toast.success(
            'Background image generation queued. It will be applied automatically when ready.'
          );
        } else {
          toast.success(
            'Background image generation queued. Review it from the puzzle page when ready.'
          );
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to queue background image generation');
      }
    })
  );

  const startGeneration = (existing_image_prompt?: string) => {
    setPhase({ state: 'generating' });
    generate_mut.mutate({
      title,
      description,
      game,
      ...buildOptionalPromptContext(),
      existing_image_prompt: existing_image_prompt || undefined
    });
  };

  const handleDeleteAndRegenerate = () => {
    if (phase.state === 'done') {
      const current_image_id = phase.image_info.id;
      setPhase({ state: 'generating' });
      delete_mut.mutate(
        { id: current_image_id },
        {
          onSuccess: () => {
            generate_mut.mutate({
              title,
              description,
              game,
              ...buildOptionalPromptContext()
            });
          },
          onError: () => {
            setPhase({ state: 'idle' });
          }
        }
      );
    }
  };

  const handleMakeImage = () => {
    if (phase.state === 'done') {
      const promptToUse = custom_prompt;
      const current_image_id = phase.image_info.id;
      setPhase({ state: 'generating' });
      delete_mut.mutate(
        { id: current_image_id },
        {
          onSuccess: () => {
            setCustomPrompt(promptToUse);
            generate_mut.mutate({
              title,
              description,
              game,
              ...buildOptionalPromptContext(),
              existing_image_prompt: promptToUse || undefined
            });
          },
          onError: () => {
            setPhase({ state: 'idle' });
          }
        }
      );
    } else {
      startGeneration(custom_prompt || undefined);
    }
  };

  const handleTabChange = (value: string | null) => {
    if (!value) return;
    // SAFETY: dialog tab trigger values are exactly the ImageDialogTab values
    const tab = value as ImageDialogTab;
    setActiveTab(tab);
    if (tab === 'existing') {
      setSelectedImage(null);
    } else {
      setSelectedImage(phase.state === 'done' ? phase.image_info : null);
    }
  };

  const handleExistingImageDeleted = (id: number) => {
    invalidateImageAssetsList();
    if (selected_image?.id === id) {
      setSelectedImage(null);
    }
    if (phase.state === 'done' && phase.image_info.id === id) {
      setPhase({ state: 'idle' });
      setCustomPrompt('');
      onImageCleared();
    }
  };

  const isWorking =
    phase.state === 'generating' ||
    delete_mut.isPending ||
    generate_mut.isPending ||
    batch_trigger_mut.isPending;

  const handleGenerateInBackground = () => {
    batch_trigger_mut.mutate({
      game,
      auto_approved,
      puzzles: [
        {
          puzzle_id,
          title,
          description,
          ...buildOptionalPromptContext()
        }
      ]
    });
  };

  return (
    <DialogContent
      className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-5xl"
      showCloseButton={!isWorking}
    >
      <DialogHeader>
        <DialogTitle className="text-center text-base font-semibold">
          {existing_image ? 'Manage Puzzle Card Image' : 'Add Puzzle Card Image'}
        </DialogTitle>
      </DialogHeader>

      <Tabs value={active_tab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="w-full">
          <TabsTrigger value="create-new" className="flex-1">
            Create New
          </TabsTrigger>
          <TabsTrigger value="existing" className="flex-1">
            Existing Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create-new">
          <CreateNewImageTab
            phase={phase}
            custom_prompt={custom_prompt}
            setCustomPrompt={setCustomPrompt}
            progress={progress}
            isWorking={isWorking}
            onStartGeneration={() => startGeneration()}
            onDelete={() => {
              if (phase.state === 'done') {
                delete_mut.mutate({ id: phase.image_info.id });
              }
            }}
            onDeleteAndRegenerate={handleDeleteAndRegenerate}
            onMakeImage={handleMakeImage}
            auto_approved={auto_approved}
            onAutoApprovedChange={setAutoApproved}
            onGenerateInBackground={handleGenerateInBackground}
            isBatchQueuing={batch_trigger_mut.isPending}
            include_word_meanings={include_word_meanings}
            onIncludeWordMeaningsChange={setIncludeWordMeanings}
            include_custom_instructions={include_custom_instructions}
            onIncludeCustomInstructionsChange={setIncludeCustomInstructions}
            custom_instructions={custom_instructions}
            onCustomInstructionsChange={setCustomInstructions}
          />
        </TabsContent>

        <TabsContent value="existing">
          <ExistingImageTab
            enabled={active_tab === 'existing'}
            selected_image_id={selected_image?.id ?? null}
            onSelect={setSelectedImage}
            onImageDeleted={handleExistingImageDeleted}
          />
        </TabsContent>
      </Tabs>

      <Button
        className="mt-1 gap-2"
        disabled={!selected_image || isWorking}
        onClick={() => selected_image && onImageAdded(selected_image)}
      >
        <Plus className="size-4" />
        Add Image to Puzzle
      </Button>
    </DialogContent>
  );
}
