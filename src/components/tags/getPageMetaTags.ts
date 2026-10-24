import { getCDNUrl } from '~/constants';

interface ShareImageInfo {
  url: string;
  width: number;
  height: number;
}

/** Stored puzzle thumbnail → `og:image` / `twitter:image`. Falls back to the project banner when absent. */
export function shareImageInfoFromAsset(
  image: { s3_key: string; width: number; height: number } | null | undefined
): ShareImageInfo | undefined {
  if (!image) return undefined;
  return {
    url: getCDNUrl(image.s3_key),
    width: image.width,
    height: image.height
  };
}

export type MetadataProject =
  | 'padavali'
  | 'padajala'
  | 'landing_page'
  | 'dvayi'
  | 'bhramita'
  | 'surupa'
  | 'anveshi';

const SITE_NAME = {
  padavali: 'Padavali',
  padajala: 'Padajāla',
  landing_page: 'Krida',
  dvayi: 'Dvayī',
  bhramita: 'Bhramitā',
  surupa: 'Surūpa',
  anveshi: 'Ānveṣī'
} as const satisfies Record<MetadataProject, string>;

interface Props {
  title: string;
  description?: string | null;
  share_image_info?: ShareImageInfo;
  project?: MetadataProject;
  robots?: string;
  canonical?: string;
}

// TODO(release): this file now targets `main`. Keep `SHARE_IMAGE_REF` on `main`
// (the merge target) — jsDelivr serves these files from that git ref, and the `krida`
// branch will be deleted after the release, which would break every share image.
const SHARE_IMAGE_REF = 'main';

/** Static share cards live in `src/images/share/<id>.jpg` (1200×630) and are served via jsDelivr. */
const shareImage = (id: string): ShareImageInfo => ({
  url: `https://cdn.jsdelivr.net/gh/shubhattin/krida@${SHARE_IMAGE_REF}/src/images/share/${id}.jpg`,
  width: 1200,
  height: 630
});

export const SHARE_IMAGE_INFO = {
  padavali: shareImage('padavali'),
  padajala: shareImage('padajala'),
  landing_page: shareImage('krida'),
  dvayi: shareImage('dvayi'),
  bhramita: shareImage('bhramita'),
  surupa: shareImage('surupa'),
  anveshi: shareImage('anveshi')
} satisfies Record<MetadataProject, ShareImageInfo>;

export const DEFAULT_SHARE_IMAGE_INFO: ShareImageInfo = SHARE_IMAGE_INFO.landing_page;

/** Site origin for canonical URLs and sitemaps (trailing slashes trimmed). */
export function siteUrl(): string {
  return import.meta.env.VITE_SITE_URL.replace(/\/+$/, '');
}

/** TanStack Router `head` meta entries. */
export function routeHeadFromPageMeta({
  title,
  description = null,
  share_image_info,
  project = 'padavali',
  robots,
  canonical
}: Props) {
  const image = share_image_info || SHARE_IMAGE_INFO[project];
  const desc = description || undefined;

  const meta = [
    { title },
    ...(desc ? ([{ name: 'description', content: desc }] as const) : []),
    ...(robots ? ([{ name: 'robots', content: robots }] as const) : []),
    { property: 'og:title', content: title },
    ...(desc ? ([{ property: 'og:description', content: desc }] as const) : []),
    { property: 'og:site_name', content: SITE_NAME[project] },
    { property: 'og:type', content: 'website' },
    ...(canonical ? ([{ property: 'og:url', content: canonical }] as const) : []),
    { property: 'og:image', content: image.url },
    { property: 'og:image:width', content: String(image.width) },
    { property: 'og:image:height', content: String(image.height) },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    ...(desc ? ([{ name: 'twitter:description', content: desc }] as const) : []),
    { name: 'twitter:image', content: image.url }
  ];
  return canonical ? { meta, links: [{ rel: 'canonical', href: canonical }] } : { meta };
}

/** @deprecated Prefer routeHeadFromPageMeta */
export function getMetadata(props: Props) {
  return routeHeadFromPageMeta(props);
}
