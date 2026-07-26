import { type Metadata } from 'next';

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
}

export const DEFAULT_SHARE_IMAGE_INFO: ShareImageInfo = {
  url: 'https://cdn.jsdelivr.net/gh/shubhattin/padavali@latest/src/images/banner/project_banner.jpg',
  width: 1200,
  height: 630
};

export const SHARE_IMAGE_INFO: Record<MetadataProject, ShareImageInfo> = {
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
};

export function getMetadata({
  title,
  description = null,
  share_image_info,
  project = 'padavali'
}: Props): Metadata {
  const image = share_image_info || SHARE_IMAGE_INFO[project];

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      //   url: '',
      siteName: 'Padavali',
      images: [
        {
          url: image.url,
          width: image.width,
          height: image.height
        }
      ],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      images: [image.url]
    }
  } satisfies Metadata;
}
