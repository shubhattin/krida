import { Streamdown } from 'streamdown';
import { cn } from '~/lib/utils';

/**
 * Rendered markdown with readable defaults (Streamdown ships unstyled HTML).
 * Keeps padding tight: list markers get a proper indent, paragraphs breathe,
 * headings stay compact.
 */
export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <Streamdown
      className={cn(
        '[&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-base [&_h1]:font-bold',
        '[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-[15px] [&_h2]:font-bold',
        '[&_h3]:mt-2.5 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_p]:my-2 [&_p]:leading-relaxed',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6',
        '[&_li]:leading-relaxed [&_li]:pl-1',
        '[&_li_>_ul]:my-1 [&_li_>_ol]:my-1',
        '[&_strong]:font-semibold',
        '[&_em]:italic',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
        '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted/60 [&_pre]:p-3',
        '[&_hr]:my-3 [&_hr]:border-border',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className
      )}
    >
      {children}
    </Streamdown>
  );
}
