import React from 'react';
import { cn } from '~/lib/utils';

type ImageSpanProps = {
  src: string;
  alt?: string;
  className?: string;
};

const ImageSpan: React.FC<ImageSpanProps> = ({ src, alt = '', className }) => {
  return (
    <span className={cn(className)}>
      <img src={src} alt={alt} className="h-full w-full" />
    </span>
  );
};

export default ImageSpan;
