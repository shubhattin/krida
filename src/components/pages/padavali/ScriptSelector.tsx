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
import {
  type ScriptLangType,
  type ScriptListType,
  getNormalizedScriptName,
  preloadScriptData
} from 'lipilekhika';

export const SCRIPT_AVATAR_MAP = {
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
} satisfies Record<ScriptListType, string>;

export const getScriptAvatar = (script: ScriptLangType) => {
  const normalizedScript = getNormalizedScriptName(script);
  if (!normalizedScript) return 'अ';
  return SCRIPT_AVATAR_MAP[normalizedScript];
};

const ScriptAvatar = ({ script }: { script: ScriptLangType }) => (
  <Avatar className="size-7">
    <AvatarFallback className="flex items-center justify-center text-base">
      {getScriptAvatar(script)}
    </AvatarFallback>
  </Avatar>
);

const prefetchedScripts = new Set<ScriptType>();

const prefetchScript = (scriptKey: ScriptType) => {
  if (prefetchedScripts.has(scriptKey)) return;
  prefetchedScripts.add(scriptKey);
  void preloadScriptData(scriptKey);
};

const ScriptSelectItem = ({ scriptKey }: { scriptKey: ScriptType }) => (
  <SelectItem
    value={scriptKey}
    onPointerEnter={() => prefetchScript(scriptKey)}
    onFocus={() => prefetchScript(scriptKey)}
  >
    <ScriptAvatar script={scriptKey} />
    {SCRIPT_NAMES[scriptKey]}
  </SelectItem>
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
    prefetchScript(script);
  }, [script]);

  useEffect(() => {
    load_posthog((posthog) => {
      posthog.capture('gameplay_script', { script });
    });
  }, [script]);

  const handleScriptChange = (value: ScriptType | null) => {
    if (!value) return;

    prefetchScript(value);
    onScriptChange(value);
    Cookies.set(SCRIPT_DATA_COOKIE_KEY, value, {
      expires: 365
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (open) prefetchScript(script);
  };

  return (
    <Select
      items={SCRIPT_ITEMS}
      value={script}
      onValueChange={handleScriptChange}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger
        className="h-8 w-46 gap-2 border-border/50 bg-background/50 text-sm"
        onPointerEnter={() => prefetchScript(script)}
        onFocus={() => prefetchScript(script)}
      >
        <ScriptAvatar script={script} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-96">
        {SCRIPT_LIST_MAIN.map((scriptKey) => (
          <ScriptSelectItem key={scriptKey} scriptKey={scriptKey} />
        ))}
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Ancient Scripts</SelectLabel>
          {SCRIPT_LIST_ANCIENT.map((scriptKey) => (
            <ScriptSelectItem key={scriptKey} scriptKey={scriptKey} />
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
