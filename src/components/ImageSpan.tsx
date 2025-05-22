import { cn } from '~/lib/utils';

const ImageSpan = ({ className, src }: { className?: string; src: string }) => {
  return (
    <span
      className={cn('inline-block bg-cover', className)}
      style={{ backgroundImage: `url(${src})` }}
    ></span>
  );
};

export default ImageSpan;
