interface ShareImageInfo {
  url: string;
  width: number;
  height: number;
}

export type MetadataProject = 'padavali' | 'padajala' | 'landing_page';

interface Props {
  title: string;
  description?: string | null;
  share_image_info?: ShareImageInfo;
  project?: MetadataProject;
  robots?: string;
}

export const DEFAULT_SHARE_IMAGE_INFO: ShareImageInfo = {
  url: 'https://cdn.jsdelivr.net/gh/shubhattin/padavali@latest/src/images/banner/project_banner.jpg',
  width: 1200,
  height: 630
};

export const SHARE_IMAGE_INFO = {
  padavali: DEFAULT_SHARE_IMAGE_INFO,
  padajala: {
    url: 'https://cdn.jsdelivr.net/gh/shubhattin/padavali@latest/src/images/banner/padajala_project_banner.jpg',
    width: 1200,
    height: 630
  },
  landing_page: {
    url: 'https://cdn.jsdelivr.net/gh/shubhattin/padavali@latest/src/images/banner/landing_page_banner.jpg',
    width: 1200,
    height: 630
  }
} satisfies Record<MetadataProject, ShareImageInfo>;

/** TanStack Router `head` meta entries. */
export function routeHeadFromPageMeta({
  title,
  description = null,
  share_image_info,
  project = 'padavali',
  robots
}: Props) {
  const image = share_image_info || SHARE_IMAGE_INFO[project];
  const desc = description || undefined;

  return {
    meta: [
      { title },
      ...(desc ? ([{ name: 'description', content: desc }] as const) : []),
      ...(robots ? ([{ name: 'robots', content: robots }] as const) : []),
      { property: 'og:title', content: title },
      ...(desc ? ([{ property: 'og:description', content: desc }] as const) : []),
      { property: 'og:site_name', content: 'Padavali' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: image.url },
      { property: 'og:image:width', content: String(image.width) },
      { property: 'og:image:height', content: String(image.height) },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      ...(desc ? ([{ name: 'twitter:description', content: desc }] as const) : []),
      { name: 'twitter:image', content: image.url }
    ]
  };
}

/** @deprecated Prefer routeHeadFromPageMeta */
export function getMetadata(props: Props) {
  return routeHeadFromPageMeta(props);
}
