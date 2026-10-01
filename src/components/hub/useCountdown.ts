'use client';

import { useEffect, useState } from 'react';

const SHOW_SECONDS_MS = 20 * 60 * 1000;

export function formatCountdown(totalMs: number): string {
  if (totalMs <= 0) return 'now';
  if (totalMs <= SHOW_SECONDS_MS) {
    const totalSeconds = Math.ceil(totalMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  const totalMinutes = Math.ceil(totalMs / (60 * 1000));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.join(' ') || 'soon';
}

export function useCountdown(target: Date | null | undefined): number | null {
  const targetMs = target ? new Date(target).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  if (targetMs == null) return null;
  return Math.max(0, targetMs - now);
}
