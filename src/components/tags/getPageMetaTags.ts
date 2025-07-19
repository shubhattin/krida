import { type Metadata } from 'next';

interface ShareImageInfo {
  url: string;
  width: number;
  height: number;
}

interface Props {
  title: string;
  description?: string | null;
  share_image_info?: ShareImageInfo;
}

export const DEFAULT_SHARE_IMAGE_INFO: ShareImageInfo = {
  url: 'https://cdn.jsdelivr.net/gh/shubhattin/padavali@latest/src/images/banner/project_banner.jpg',
  width: 1200,
  height: 630
};

export function getMetadata({ title, description = null, share_image_info }: Props): Metadata {
  const image = share_image_info || DEFAULT_SHARE_IMAGE_INFO;

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
