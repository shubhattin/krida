'use client';

import { Play } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

/** Full-board start gate. Avoid backdrop-filter — it lets clicks pass through in some browsers. */
export function SimpleGameStartOverlay({
  label,
  buttonClassName,
  onStart
}: {
  label: string;
  buttonClassName: string;
  onStart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
      <Button
        type="button"
        size="lg"
        className={cn('pointer-events-auto text-white shadow-lg', buttonClassName)}
        onClick={onStart}
      >
        <Play className="size-5" />
        {label}
      </Button>
    </div>
  );
}
