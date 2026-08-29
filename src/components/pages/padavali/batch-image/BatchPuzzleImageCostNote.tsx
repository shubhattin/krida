export function BatchPuzzleImageCostNote({ className }: { className?: string }) {
  return (
    <p className={className ?? 'text-muted-foreground text-xs'}>
      Background batch image generation is about 50% cheaper than instant generation.
    </p>
  );
}
