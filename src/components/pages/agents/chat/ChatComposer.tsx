import { useRef, useState, type ReactNode } from 'react';
import { ArrowUpIcon, SquareIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from '~/components/ui/input-group';

/** Message field: Enter sends, Shift+Enter adds a line, Stop while the agent replies. */
export function ChatComposer({
  onSend,
  onStop,
  busy,
  placeholder = 'Message the agent…',
  toolbar,
  autoFocus
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy: boolean;
  placeholder?: string;
  /** Left side of the bottom bar (e.g. the model picker). */
  toolbar?: ReactNode;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const canSend = text.trim().length > 0 && !busy;

  return (
    <form
      ref={formRef}
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) return;
        onSend(text.trim());
        setText('');
      }}
    >
      <InputGroup
        className="rounded-2xl shadow-sm"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        <InputGroupTextarea
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder={placeholder}
          aria-label="Message"
          autoFocus={autoFocus}
          rows={3}
          style={{ fieldSizing: 'fixed' }}
          className="max-h-60 min-h-14 resize-none overflow-y-auto px-3.5 pt-3 text-base md:text-[15px]"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="gap-1 px-2 pb-2">
          {toolbar}
          {busy && onStop ? (
            <InputGroupButton
              type="button"
              variant="outline"
              size="icon-sm"
              className="ml-auto rounded-full"
              aria-label="Stop"
              onClick={onStop}
            >
              <SquareIcon className="size-3 fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              className="ml-auto rounded-full transition-opacity duration-300 disabled:opacity-70"
              disabled={!canSend}
              aria-label="Send"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
