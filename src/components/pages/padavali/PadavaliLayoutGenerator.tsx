'use client';

import { useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Info, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
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
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { cn } from '~/lib/utils';
import { splitDevanagariAksharas } from '~/util/puzzle/devanagari_syllables';
import {
  generatePadavaliLayouts,
  rankGeneratedLayouts,
  type GeneratedPadavaliLayout,
  type LayoutNeighborhoodMode,
  type LayoutPathStyle,
  type LayoutRanking
} from '~/util/puzzle/layout_generator';
import { isWordAdded, type PadavaliWordCandidate } from '~/util/puzzle/word_list';
import {
  buildCellWordColorMapFromPlacements,
  cellWordTintAppearance,
  getWordColorPair,
  wordColorCssVars,
  wordColorSwatchClassName
} from '~/util/puzzle/word_colors';

const LAYOUT_NEIGHBORHOOD_ITEMS = [
  { value: 'all', label: 'All styles' },
  { value: 'n8', label: 'Any neighboring cell' },
  { value: 'n4', label: 'Up, down, left, and right' }
] as const;

const LAYOUT_PATH_STYLE_ITEMS = [
  { value: 'flexible', label: 'Free to turn' },
  { value: 'straight', label: 'Left to right & top to bottom' }
] as const;

const NEIGHBOR_MOVES_INFO =
  'Which cells can be the next step in a word. “Any neighboring” includes diagonals; “up/down/left/right” is orthogonal only. “All styles” mixes both across candidates.';

const WORD_ORDER_INFO =
  'How akṣaras are ordered along each word. Free to turn may bend using neighbor moves. Left-to-right & top-to-bottom keeps every word as a straight across or down run.';

const LAYOUT_RANKING_ITEMS = [
  { value: 'words', label: 'Most words' },
  { value: 'fill', label: 'Fewest empty cells' }
] as const;

const LAYOUT_CANDIDATE_LIMITS = [4, 8, 12, 16, 24, 32] as const;
type LayoutCandidateLimit = (typeof LAYOUT_CANDIDATE_LIMITS)[number];

const LAYOUT_CANDIDATE_LIMIT_ITEMS = LAYOUT_CANDIDATE_LIMITS.map((limit) => ({
  value: String(limit),
  label: `${limit} layouts`
}));

function parseLayoutNeighborhood(value: string | null | undefined): LayoutNeighborhoodMode | null {
  if (value === 'all' || value === 'n8' || value === 'n4') return value;
  return null;
}

function parseLayoutPathStyle(value: string | null | undefined): LayoutPathStyle | null {
  if (value === 'flexible' || value === 'straight') return value;
  return null;
}

function parseLayoutRanking(value: string | null | undefined): LayoutRanking | null {
  if (value === 'words' || value === 'fill') return value;
  return null;
}

function parseLayoutCandidateLimit(value: string | null | undefined): LayoutCandidateLimit | null {
  const parsed = Number(value);
  for (const limit of LAYOUT_CANDIDATE_LIMITS) {
    if (limit === parsed) return limit;
  }
  return null;
}

function layoutCandidateKey(candidate: GeneratedPadavaliLayout): string {
  return candidate.gridData.map((row) => row.join('\0')).join('\n');
}

const LAYOUT_PREVIEW_FRAME_PX = 256;
const LAYOUT_PREVIEW_GAP_PX = 1;

function GeneratedLayoutPreview({
  candidate,
  gridDimensions
}: {
  candidate: GeneratedPadavaliLayout;
  wordList?: readonly PadavaliWordCandidate[];
  gridDimensions: [number, number];
}) {
  const [rows, cols] = gridDimensions;
  const cellColorMap = buildCellWordColorMapFromPlacements(candidate.placements);
  const majorSpan = Math.max(rows, cols, 1);
  const cellPx = Math.max(
    1,
    Math.floor((LAYOUT_PREVIEW_FRAME_PX - (majorSpan - 1) * LAYOUT_PREVIEW_GAP_PX) / majorSpan)
  );
  const gridWidth = cellPx * cols + LAYOUT_PREVIEW_GAP_PX * Math.max(0, cols - 1);
  const gridHeight = cellPx * rows + LAYOUT_PREVIEW_GAP_PX * Math.max(0, rows - 1);
  const fontSizePx = Math.max(8, Math.min(14, cellPx - 6));
  const trailGlowWidth = Math.max(2, Math.min(4.5, cellPx * 0.22));
  const trailMainWidth = Math.max(1, Math.min(2, cellPx * 0.1));

  const cellCenter = (row: number, col: number) => ({
    x: col * (cellPx + LAYOUT_PREVIEW_GAP_PX) + cellPx / 2,
    y: row * (cellPx + LAYOUT_PREVIEW_GAP_PX) + cellPx / 2
  });

  const buildPoints = (path: readonly (readonly [number, number])[]) =>
    path
      .map(([row, col]) => {
        const { x, y } = cellCenter(row, col);
        return `${x},${y}`;
      })
      .join(' ');

  return (
    <div
      className="border-border/60 bg-muted/20 flex shrink-0 items-center justify-center rounded-md border p-1"
      style={{ width: LAYOUT_PREVIEW_FRAME_PX + 10, height: LAYOUT_PREVIEW_FRAME_PX + 10 }}
    >
      <div
        aria-label={`Generated ${rows} by ${cols} grid preview`}
        className="relative"
        style={{ width: gridWidth, height: gridHeight }}
      >
        <div
          className="bg-border/60 relative z-10 grid"
          style={{
            width: gridWidth,
            height: gridHeight,
            gap: LAYOUT_PREVIEW_GAP_PX,
            gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellPx}px)`
          }}
        >
          {candidate.gridData.flatMap((row, rowIndex) =>
            row.map((cell, columnIndex) => {
              const tint = cellWordTintAppearance(cellColorMap.get(`${rowIndex},${columnIndex}`));
              const isEmpty = cell.trim() === '';
              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  className={cn(
                    'relative z-10 flex items-center justify-center overflow-hidden rounded-[2px] font-medium leading-none',
                    isEmpty ? 'bg-background text-transparent' : 'bg-background text-foreground',
                    tint.className
                  )}
                  style={{
                    width: cellPx,
                    height: cellPx,
                    fontSize: fontSizePx,
                    lineHeight: 1,
                    ...tint.style
                  }}
                >
                  {cell}
                </div>
              );
            })
          )}
        </div>
        {/* Soft path overlay — readable glyphs, still clear path order */}
        <svg
          className="pointer-events-none absolute inset-0 z-20 overflow-visible"
          width={gridWidth}
          height={gridHeight}
          aria-hidden
        >
          {candidate.placements.map(({ slotIndex, path }) => {
            if (path.length < 2) return null;
            const points = buildPoints(path);
            const pair = getWordColorPair(slotIndex);
            return (
              <g key={`preview-trail-${slotIndex}-${path.map(([r, c]) => `${r},${c}`).join('|')}`}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.light.swatch}
                  strokeWidth={trailGlowWidth}
                  strokeOpacity={0.08}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="dark:hidden"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.light.swatch}
                  strokeWidth={trailMainWidth}
                  strokeOpacity={0.26}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="dark:hidden"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.dark.swatch}
                  strokeWidth={trailGlowWidth}
                  strokeOpacity={0.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden dark:block"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={pair.dark.swatch}
                  strokeWidth={trailMainWidth}
                  strokeOpacity={0.28}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden dark:block"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function WordChipList({
  slotIndices,
  wordList,
  emptyLabel,
  tone = 'default'
}: {
  slotIndices: readonly number[];
  wordList: readonly PadavaliWordCandidate[];
  emptyLabel: string;
  tone?: 'default' | 'warning';
}) {
  if (slotIndices.length === 0) {
    return <p className="text-muted-foreground text-xs">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {slotIndices.map((slotIndex) => {
        const word = wordList[slotIndex]?.word.trim() || 'Untitled word';
        const colorPair = getWordColorPair(slotIndex);
        return (
          <Badge
            key={slotIndex}
            variant="outline"
            className={cn(
              'max-w-full gap-1.5 font-normal',
              tone === 'warning' &&
                'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
            )}
          >
            {tone === 'default' ? (
              <span
                aria-hidden
                className={cn('size-2 shrink-0 rounded-full', wordColorSwatchClassName)}
                style={wordColorCssVars(colorPair)}
              />
            ) : null}
            <span className="truncate">{word}</span>
          </Badge>
        );
      })}
    </div>
  );
}

function neighborhoodLabel(neighborhood: GeneratedPadavaliLayout['neighborhood']): string {
  return neighborhood === 'n4' ? 'Up, down, left, and right' : 'Any neighboring cell';
}

function LayoutCandidateDetail({
  candidate,
  wordList,
  gridDimensions
}: {
  candidate: GeneratedPadavaliLayout;
  wordList: readonly PadavaliWordCandidate[];
  gridDimensions: [number, number];
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <GeneratedLayoutPreview
        candidate={candidate}
        wordList={wordList}
        gridDimensions={gridDimensions}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-muted-foreground text-xs">{neighborhoodLabel(candidate.neighborhood)}</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Placed</h4>
            <Badge variant="secondary" className="tabular-nums">
              {candidate.placedSlotIndices.length}
            </Badge>
          </div>
          <WordChipList
            slotIndices={candidate.placedSlotIndices}
            wordList={wordList}
            emptyLabel="No words placed in this layout."
          />
        </div>
        {candidate.omittedSlotIndices.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300">Excluded</h4>
              <Badge
                variant="outline"
                className="border-amber-500/40 tabular-nums text-amber-700 dark:text-amber-300"
              >
                {candidate.omittedSlotIndices.length}
              </Badge>
            </div>
            <WordChipList
              slotIndices={candidate.omittedSlotIndices}
              wordList={wordList}
              emptyLabel="No excluded words."
              tone="warning"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LayoutTabsCarousel({
  candidates,
  activeKey,
  onSelect
}: {
  candidates: GeneratedPadavaliLayout[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
    skipSnaps: true,
    watchDrag: () => true
  });
  const activeIndex = candidates.findIndex(
    (candidate) => layoutCandidateKey(candidate) === activeKey
  );
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex >= 0 && activeIndex < candidates.length - 1;

  useEffect(() => {
    emblaApi?.reInit();
  }, [candidates, emblaApi]);

  useEffect(() => {
    if (!emblaApi || activeIndex < 0) return;
    emblaApi.scrollTo(activeIndex);
  }, [activeKey, activeIndex, emblaApi]);

  const goToIndex = (index: number) => {
    const next = candidates[index];
    if (!next) return;
    onSelect(layoutCandidateKey(next));
    emblaApi?.scrollTo(index);
  };

  return (
    <div className="border-border bg-popover flex shrink-0 flex-col gap-1.5 border-b px-3 py-2 sm:px-4">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          disabled={!canGoPrev}
          aria-label="Previous layout"
          onClick={() => goToIndex(activeIndex - 1)}
        >
          <ChevronLeft />
        </Button>

        <div
          ref={emblaRef}
          className="min-w-0 flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
          style={{ touchAction: 'pan-y' }}
        >
          <TabsList
            variant="line"
            className="flex! h-auto w-max max-w-none touch-pan-y select-none justify-start gap-1"
          >
            {candidates.map((candidate, index) => {
              const key = layoutCandidateKey(candidate);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex-none shrink-0 grow-0 basis-auto select-none px-3"
                >
                  Layout {index + 1}
                  <Badge variant="secondary" className="tabular-nums">
                    {candidate.score.placedWordCount}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          disabled={!canGoNext}
          aria-label="Next layout"
          onClick={() => goToIndex(activeIndex + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <p className="text-muted-foreground/70 select-none px-0.5 text-[11px]">
        Number = words placed · drag tabs to browse
      </p>
    </div>
  );
}

export type PadavaliLayoutGeneratorProps = {
  wordList: readonly PadavaliWordCandidate[];
  gridDimensions: [number, number];
  onApply: (layout: GeneratedPadavaliLayout) => void;
};

export function PadavaliLayoutGenerator({
  wordList,
  gridDimensions,
  onApply
}: PadavaliLayoutGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ranking, setRanking] = useState<LayoutRanking>('words');
  const [neighborhood, setNeighborhood] = useState<LayoutNeighborhoodMode>('all');
  const [pathStyle, setPathStyle] = useState<LayoutPathStyle>('flexible');
  const [maxCandidates, setMaxCandidates] = useState<LayoutCandidateLimit>(12);
  const [generationSeed, setGenerationSeed] = useState(1);
  const [candidates, setCandidates] = useState<GeneratedPadavaliLayout[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [candidateToApply, setCandidateToApply] = useState<GeneratedPadavaliLayout | null>(null);

  const rankedCandidates = useMemo(
    () => rankGeneratedLayouts(candidates, ranking),
    [candidates, ranking]
  );
  const rankedKeys = useMemo(() => rankedCandidates.map(layoutCandidateKey), [rankedCandidates]);
  const activeKey = rankedKeys.includes(selectedKey) ? selectedKey : (rankedKeys[0] ?? '');
  const activeCandidate =
    rankedCandidates.find((candidate) => layoutCandidateKey(candidate) === activeKey) ?? null;

  const runGeneration = ({
    limit = maxCandidates,
    rankingOverride = ranking,
    neighborhoodOverride = neighborhood,
    pathStyleOverride = pathStyle
  }: {
    limit?: LayoutCandidateLimit;
    rankingOverride?: LayoutRanking;
    neighborhoodOverride?: LayoutNeighborhoodMode;
    pathStyleOverride?: LayoutPathStyle;
  } = {}) => {
    const usableCount = wordList.filter(
      (entry) => isWordAdded(entry) && splitDevanagariAksharas(entry.word).length > 0
    ).length;
    if (usableCount === 0) {
      toast.error('Add at least one Devanagari word before generating a layout');
      return false;
    }
    const nextSeed = generationSeed + 1;
    const nextCandidates = generatePadavaliLayouts({
      words: wordList,
      dimensions: gridDimensions,
      maxCandidates: limit,
      attempts: Math.max(48, limit * 6),
      neighborhood: neighborhoodOverride,
      pathStyle: pathStyleOverride,
      seed: nextSeed
    });
    if (nextCandidates.length === 0) {
      // Keep prior candidates when a control change finds nothing (e.g. straight runs that cannot fit).
      setNeighborhood(neighborhoodOverride);
      setPathStyle(pathStyleOverride);
      setGenerationSeed(nextSeed);
      toast.error(
        'No layout fits these neighbor/word-order settings on the current grid. Try Free to turn, or a larger grid.'
      );
      return false;
    }
    const ranked = rankGeneratedLayouts(nextCandidates, rankingOverride);
    setCandidates(nextCandidates);
    setMaxCandidates(limit);
    setNeighborhood(neighborhoodOverride);
    setPathStyle(pathStyleOverride);
    setGenerationSeed(nextSeed);
    setSelectedKey(ranked[0] ? layoutCandidateKey(ranked[0]) : '');
    setCandidateToApply(null);
    return true;
  };

  const openGenerator = () => {
    if (!runGeneration({ rankingOverride: 'words' })) return;
    setRanking('words');
    setOpen(true);
  };

  const applyCandidate = () => {
    if (!candidateToApply) return;
    onApply(candidateToApply);
    setConfirmOpen(false);
    setOpen(false);
    toast.success('Generated layout applied');
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={openGenerator}>
        <WandSparkles data-icon="inline-start" />
        Generate layouts
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setCandidateToApply(null);
            setSelectedKey('');
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 gap-1.5 px-4 pb-3 pr-12 pt-4">
            <DialogTitle>Generate grid layouts</DialogTitle>
            <DialogDescription>
              Browse candidates for the current grid size. Choosing one replaces the grid; words
              that do not fit stay in your list.
            </DialogDescription>
          </DialogHeader>

          <div className="border-border bg-muted/20 shrink-0 border-b px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <Label
                    htmlFor="padavali-layout-neighborhood"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
                  >
                    Neighbor moves
                  </Label>
                  <Popover>
                    <PopoverTrigger
                      render={<Info className="text-muted-foreground size-3.5" />}
                      nativeButton={false}
                      aria-label="About neighbor moves"
                    />
                    <PopoverContent className="max-w-xs text-xs leading-snug" align="start">
                      {NEIGHBOR_MOVES_INFO}
                    </PopoverContent>
                  </Popover>
                </div>
                <Select
                  items={[...LAYOUT_NEIGHBORHOOD_ITEMS]}
                  value={neighborhood}
                  onValueChange={(value) => {
                    const nextNeighborhood = parseLayoutNeighborhood(value);
                    if (!nextNeighborhood || nextNeighborhood === neighborhood) return;
                    runGeneration({ neighborhoodOverride: nextNeighborhood });
                  }}
                >
                  <SelectTrigger id="padavali-layout-neighborhood" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_NEIGHBORHOOD_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <Label
                    htmlFor="padavali-layout-path-style"
                    className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
                  >
                    Word order
                  </Label>
                  <Popover>
                    <PopoverTrigger
                      render={<Info className="text-muted-foreground size-3.5" />}
                      nativeButton={false}
                      aria-label="About word order"
                    />
                    <PopoverContent className="max-w-xs text-xs leading-snug" align="start">
                      {WORD_ORDER_INFO}
                    </PopoverContent>
                  </Popover>
                </div>
                <Select
                  items={[...LAYOUT_PATH_STYLE_ITEMS]}
                  value={pathStyle}
                  onValueChange={(value) => {
                    const nextStyle = parseLayoutPathStyle(value);
                    if (!nextStyle || nextStyle === pathStyle) return;
                    runGeneration({ pathStyleOverride: nextStyle });
                  }}
                >
                  <SelectTrigger id="padavali-layout-path-style" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_PATH_STYLE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label
                  htmlFor="padavali-layout-ranking"
                  className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
                >
                  Rank by
                </Label>
                <Select
                  items={[...LAYOUT_RANKING_ITEMS]}
                  value={ranking}
                  onValueChange={(value) => {
                    const nextRanking = parseLayoutRanking(value);
                    if (nextRanking) setRanking(nextRanking);
                  }}
                >
                  <SelectTrigger id="padavali-layout-ranking" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_RANKING_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground/80 text-[11px] leading-snug">
                  Reorders tabs without regenerating
                </p>
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Label
                  htmlFor="padavali-layout-candidate-limit"
                  className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
                >
                  Candidates
                </Label>
                <Select
                  items={[...LAYOUT_CANDIDATE_LIMIT_ITEMS]}
                  value={String(maxCandidates)}
                  onValueChange={(value) => {
                    const nextLimit = parseLayoutCandidateLimit(value);
                    if (!nextLimit || nextLimit === maxCandidates) return;
                    runGeneration({ limit: nextLimit });
                  }}
                >
                  <SelectTrigger id="padavali-layout-candidate-limit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_CANDIDATE_LIMIT_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground/80 text-[11px] leading-snug">
                  Max distinct layouts to keep
                </p>
              </div>
            </div>
          </div>

          {rankedCandidates.length > 0 && activeKey ? (
            <Tabs
              value={activeKey}
              onValueChange={setSelectedKey}
              className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
            >
              <LayoutTabsCarousel
                candidates={rankedCandidates}
                activeKey={activeKey}
                onSelect={setSelectedKey}
              />

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-4">
                {rankedCandidates.map((candidate) => {
                  const key = layoutCandidateKey(candidate);
                  return (
                    <TabsContent key={key} value={key} className="mt-0 outline-none">
                      <LayoutCandidateDetail
                        candidate={candidate}
                        wordList={wordList}
                        gridDimensions={gridDimensions}
                      />
                    </TabsContent>
                  );
                })}
              </div>
            </Tabs>
          ) : null}

          <DialogFooter className="border-border shrink-0 border-t px-4 py-3">
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  runGeneration();
                }}
              >
                Generate again
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!activeCandidate}
                  onClick={() => {
                    if (!activeCandidate) return;
                    setCandidateToApply(activeCandidate);
                    setConfirmOpen(true);
                  }}
                >
                  Use this layout
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the current grid?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current grid letters. Words that do not fit will be excluded, while
              remaining in the word list. You can undo this as one change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current grid</AlertDialogCancel>
            <AlertDialogAction onClick={applyCandidate}>Use generated layout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
