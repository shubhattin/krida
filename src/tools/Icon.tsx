import React from 'react';
import type { IconType } from '~/components/icons';
import { cn } from '~/lib/utils';

type IconProps = {
  src: IconType;
  title?: string;
  className?: string;
  outerClass?: string;
  viewBox?: string;
  children?: React.ReactNode;
};

const Icon: React.FC<IconProps> = ({
  src,
  title,
  className = '',
  outerClass,
  viewBox,
  children
}) => {
  const innerHtml = (title ? `<title>${title}</title>` : '') + src.c;

  return (
    <span className={outerClass}>
      <svg
        stroke="currentColor"
        fill="currentColor"
        strokeWidth="0"
        className={cn('inline-block bg-cover', className)}
        height="1em"
        width="1em"
        {...src.a}
        viewBox={viewBox ?? src.a.viewBox}
        xmlns="http://www.w3.org/2000/svg"
        dangerouslySetInnerHTML={{ __html: innerHtml }}
      />
      {children}
    </span>
  );
};

export default Icon;
