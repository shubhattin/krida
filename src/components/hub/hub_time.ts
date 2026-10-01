const SANSKRIT_WEEKDAYS = [
  'रविवासरः',
  'सोमवासरः',
  'मङ्गलवासरः',
  'बुधवासरः',
  'गुरुवासरः',
  'शुक्रवासरः',
  'शनिवासरः'
] as const;

const MASTHEAD_FORMAT = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

export function asTime(value: Date | string | number): number {
  return new Date(value).getTime();
}

export function formatMastheadDate(now: Date) {
  return {
    weekdaySanskrit: SANSKRIT_WEEKDAYS[now.getDay()] ?? '',
    dateLabel: MASTHEAD_FORMAT.format(now)
  };
}

export function formatDurationHuman(totalMs: number): string {
  const clamped = Math.max(0, totalMs);
  const totalMinutes = Math.ceil(clamped / (60 * 1000));
  if (totalMinutes <= 1) return '1 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} min`);
  return parts.join(' ') || 'soon';
}

export function remainingMs(target: Date | string | number, now = Date.now()): number {
  return Math.max(0, asTime(target) - now);
}

/** Show a "New" badge while a daily still has most of its window left. */
export function isFreshDaily(endTime: Date | string, now = Date.now()): boolean {
  return remainingMs(endTime, now) > 12 * 60 * 60 * 1000;
}
