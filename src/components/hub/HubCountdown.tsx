'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '~/lib/utils';

const SHOW_SECONDS_MS = 20 * 60 * 1000;

function toMs(target: Date | string) {
  return new Date(target).getTime();
}

export function formatHubCountdown(totalMs: number) {
  const clamped = Math.max(0, totalMs);
  if (clamped <= SHOW_SECONDS_MS) {
    const totalSeconds = Math.ceil(clamped / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const totalMinutes = Math.ceil(clamped / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.join(' ') || 'soon';
}

export function useCountdownMs(target: Date | string | null | undefined) {
  const targetMs = target ? toMs(target) : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs == null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  if (targetMs == null) return null;
  return Math.max(0, targetMs - now);
}

export function HubCountdown({
  target,
  prefix,
  className
}: {
  target: Date | string;
  prefix?: string;
  className?: string;
}) {
  const remaining = useCountdownMs(target);
  if (remaining == null) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 tabular-nums', className)}>
      <Clock className="size-3.5 shrink-0" />
      {prefix ? `${prefix} ` : null}
      {formatHubCountdown(remaining)}
    </span>
  );
}
