'use client';

import { useContext, useEffect, useMemo, useState } from 'react';
import {
  createTypingContext,
  clearTypingContextOnKeyDown,
  handleTypingBeforeInputEvent
} from 'lipilekhika/typing';
import { SearchIcon } from 'lucide-react';
import { AppContext } from '~/components/AppDataContext';
import { ScriptSelector } from '~/components/pages/padavali/ScriptSelector';
import { LanguageIcon } from '~/components/icons';
import Icon from '~/tools/Icon';
import { InputGroup, InputGroupAddon, InputGroupInput } from '~/components/ui/input-group';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import type { LibrarySearch } from './library_search';

export function HubLibrarySearch({
  search,
  onQueryChange,
  id
}: {
  search: LibrarySearch;
  onQueryChange: (query: string) => void;
  id?: string;
}) {
  const { script, setScript } = useContext(AppContext);
  const [lipiTyping, setLipiTyping] = useState(false);
  const typingCtx = useMemo(() => createTypingContext(script!), [script]);

  useEffect(() => {
    void typingCtx.ready;
  }, [typingCtx]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <InputGroup className="h-11 w-full sm:flex-1">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={search.q ?? ''}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          onBeforeInput={(event) =>
            handleTypingBeforeInputEvent(
              typingCtx,
              event,
              (next) => onQueryChange(next),
              lipiTyping
            )
          }
          onBlur={() => typingCtx.clearContext()}
          onKeyDown={(event) => {
            if (
              event.altKey &&
              (event.key === 'x' || event.key === 'X' || event.key === 'c' || event.key === 'C')
            ) {
              event.preventDefault();
              setLipiTyping((prev) => !prev);
              return;
            }
            clearTypingContextOnKeyDown(event, typingCtx);
          }}
          placeholder="Search by title or description"
          aria-label="Search puzzles"
        />
      </InputGroup>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Label className="inline-flex items-center gap-2 font-medium">
          <Switch
            checked={lipiTyping}
            onCheckedChange={setLipiTyping}
            aria-label="Enable Lipi Lekhika typing in search"
          />
          <Icon src={LanguageIcon} className="size-6" />
        </Label>
        <ScriptSelector script={script} onScriptChange={setScript} />
      </div>
    </div>
  );
}
