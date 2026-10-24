import { code } from '@streamdown/code';
import { Streamdown } from 'streamdown';
import { cn } from '~/lib/utils';

const plugins = { code };

/**
 * Agent replies. Streamdown repairs half-streamed markdown (unclosed bold, tables, fences) and
 * highlights code; the classes here only set readable spacing — tables and code blocks keep
 * Streamdown's own styling.
 */
export function AgentMarkdown({
  children,
  streaming = false,
  className
}: {
  children: string;
  streaming?: boolean;
  className?: string;
}) {
  return (
    <Streamdown
      plugins={plugins}
      isAnimating={streaming}
      mode={streaming ? 'streaming' : 'static'}
      shikiTheme={['github-light', 'github-dark']}
      controls={{ table: true, code: true, mermaid: false }}
      className={cn(
        'min-w-0 text-sm leading-relaxed text-foreground',
        '[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-bold',
        '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold',
        '[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold',
        '[&_p]:my-2',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6',
        '[&_li]:pl-1 [&_li_>_ol]:my-1 [&_li_>_ul]:my-1',
        '[&_em]:italic [&_strong]:font-semibold',
        '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline',
        '[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.8em]',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&_hr]:my-4 [&_hr]:border-border',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className
      )}
    >
      {children}
    </Streamdown>
  );
}
