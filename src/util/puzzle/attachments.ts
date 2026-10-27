import type { z } from 'zod';
import {
  attachment_schema,
  DEFAULT_FALLBACK_YOUTUBE_EMBED_URL,
  DEFAULT_YOUTUBE_EMBED
} from '~/db/db_shared_vals';
import type { GameKind } from '~/util/catalog/tags';

export type Attachment = z.infer<typeof attachment_schema>;

/** Per-game YouTube embed override; missing games fall back to DEFAULT_FALLBACK_YOUTUBE_EMBED_URL. */
// oxlint-disable-next-line anti-slop/no-known-value-widening -- intentional open dictionary: new games fall back via ??
export const GAME_YOUTUBE_EMBED_URLS: Partial<Record<GameKind, string>> = {
  padajala: 'https://www.youtube.com/live/-lRaIcjAkz8?si=UhXdwGFUJcL0BACS'
};

export function getDefaultYoutubeEmbedUrl(game?: GameKind): string {
  return (game ? GAME_YOUTUBE_EMBED_URLS[game] : undefined) ?? DEFAULT_FALLBACK_YOUTUBE_EMBED_URL;
}

export function resolveAttachmentsWithDefaults(
  attachments: Attachment[],
  game?: GameKind
): Attachment[] {
  const list = attachments.map((v) => v);
  const default_attachment = {
    id: 0,
    ...DEFAULT_YOUTUBE_EMBED,
    url: getDefaultYoutubeEmbedUrl(game),
    order_index: 1
  } satisfies Attachment;

  if (list.length === 0) {
    return [default_attachment];
  }

  const any_youtube_embed = list.some((v) => v.type === 'youtube_embed');
  if (!any_youtube_embed) {
    list.push({
      ...default_attachment,
      order_index: list.length + 1
    });
  }

  return list;
}
