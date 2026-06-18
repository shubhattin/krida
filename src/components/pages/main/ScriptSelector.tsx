'use client';

import {
  SCRIPT_DATA_COOKIE_KEY,
  SCRIPT_LIST_ANCIENT,
  SCRIPT_LIST_MAIN,
  SCRIPT_NAMES,
  type ScriptType
} from '~/state/script_list';
import Cookies from 'js-cookie';
import { useEffect } from 'react';
import { load_posthog } from '~/components/tags/PosthogInit';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select';
import { type ScriptLangType, type ScriptListType, getNormalizedScriptName } from 'lipilekhika';

export const SCRIPT_AVATAR_MAP: Record<ScriptListType, string> = {
  Devanagari: 'अ',
  Telugu: 'అ',
  Tamil: 'அ',
  'Tamil-Extended': 'அ',
  Bengali: 'অ',
  Kannada: 'ಅ',
  Gujarati: 'અ',
  Malayalam: 'അ',
  Odia: 'ଅ',
  Sinhala: 'අ',
  Normal: 'a',
  Romanized: 'ā',
  Gurumukhi: 'ਅ',
  Assamese: 'অ',
  Siddham: '𑖀',
  'Purna-Devanagari': 'अ',
  Brahmi: '𑀅',
  Granth: '𑌅',
  Modi: '𑘀',
  Sharada: '𑆃'
};

export const getScriptAvatar = (script: ScriptLangType) => {
  const normalizedScript = getNormalizedScriptName(script);
  if (!normalizedScript) return 'अ';
  return SCRIPT_AVATAR_MAP[normalizedScript];
};

const ScriptAvatar = ({ script }: { script: ScriptLangType }) => (
  <Avatar>
    <AvatarFallback>{getScriptAvatar(script)}</AvatarFallback>
  </Avatar>
);

const SCRIPT_ITEMS = [
  ...SCRIPT_LIST_MAIN.map((script) => ({
    label: SCRIPT_NAMES[script],
    value: script
  })),
  ...SCRIPT_LIST_ANCIENT.map((script) => ({
    label: SCRIPT_NAMES[script],
    value: script
  }))
];

type Props = {
  script: ScriptType;
  onScriptChange: (script: ScriptType) => void;
};

export const ScriptSelector = ({ script, onScriptChange }: Props) => {
  useEffect(() => {
    load_posthog((posthog) => {
      posthog.capture('gameplay_script', { script });
    });
  }, [script]);

  const handleScriptChange = (value: ScriptType | null) => {
    if (!value) return;

    onScriptChange(value);
    Cookies.set(SCRIPT_DATA_COOKIE_KEY, value, {
      expires: 365
    });
  };

  return (
    <Select items={SCRIPT_ITEMS} value={script} onValueChange={handleScriptChange}>
      <SelectTrigger className="h-10 w-48 gap-2 border-border/50 bg-background/50 text-sm">
        <ScriptAvatar script={script} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-96">
        {SCRIPT_LIST_MAIN.map((scriptKey) => (
          <SelectItem key={scriptKey} value={scriptKey}>
            <ScriptAvatar script={scriptKey} />
            {SCRIPT_NAMES[scriptKey]}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Ancient Scripts</SelectLabel>
          {SCRIPT_LIST_ANCIENT.map((scriptKey) => (
            <SelectItem key={scriptKey} value={scriptKey}>
              <ScriptAvatar script={scriptKey} />
              {SCRIPT_NAMES[scriptKey]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
