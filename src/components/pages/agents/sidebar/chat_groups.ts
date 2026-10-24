import { differenceInCalendarDays } from 'date-fns';

const GROUPS = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older'] as const;
export type ChatGroupLabel = (typeof GROUPS)[number];

function groupLabel(date: Date, now: Date): ChatGroupLabel {
  const days = differenceInCalendarDays(now, date);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Previous 7 days';
  if (days < 30) return 'Previous 30 days';
  return 'Older';
}

/** Sidebar sections by last activity, newest first (input is already sorted). */
export function groupChatsByDate<T extends { updated_at: Date | string }>(
  chats: T[],
  now = new Date()
) {
  const grouped = new Map<ChatGroupLabel, T[]>();
  for (const chat of chats) {
    const label = groupLabel(new Date(chat.updated_at), now);
    grouped.set(label, [...(grouped.get(label) ?? []), chat]);
  }
  return GROUPS.filter((label) => grouped.has(label)).map((label) => ({
    label,
    chats: grouped.get(label)!
  }));
}
