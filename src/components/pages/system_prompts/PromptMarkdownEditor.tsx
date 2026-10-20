import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useTheme } from '~/components/theme-provider';
import { cn } from '~/lib/utils';

/**
 * Real markdown editor (CodeMirror) — no overlay tricks, so the caret can
 * never drift from the glyphs. Follows the app theme.
 */
export function PromptMarkdownEditor({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  const [system_dark, set_system_dark] = useState(
    () => !import.meta.env.SSR && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on_change = () => set_system_dark(mq.matches);
    mq.addEventListener('change', on_change);
    return () => mq.removeEventListener('change', on_change);
  }, []);

  const dark = theme === 'dark' || (theme === 'system' && system_dark);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-input text-xs focus-within:border-ring',
        className
      )}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        height="320px"
        theme={dark ? oneDark : 'light'}
        extensions={[markdown(), EditorView.lineWrapping]}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false
        }}
        style={{ fontSize: 13 }}
      />
    </div>
  );
}
