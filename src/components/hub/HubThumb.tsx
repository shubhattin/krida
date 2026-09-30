import { Image } from '@unpic/react';
import { getCDNUrl } from '~/constants';
import { cn } from '~/lib/utils';
import { PUZZLE_CARD_IMAGE_ASPECT_RATIO } from '~/components/pages/padavali/listed_puzzle_display';

type HubImage = { s3_key: string; width: number; height: number } | null | undefined;

export function HubThumb({
  image,
  alt,
  className
}: {
  image: HubImage;
  alt: string;
  className?: string;
}) {
  const [w, h] = PUZZLE_CARD_IMAGE_ASPECT_RATIO;
  if (!image) {
    return <div className={cn('bg-muted', className)} aria-hidden />;
  }
  return (
    <Image
      src={getCDNUrl(image.s3_key)}
      alt={alt}
      width={w * 64}
      height={h * 64}
      className={cn('size-full object-cover object-center', className)}
    />
  );
}
