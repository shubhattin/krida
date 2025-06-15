'use client';

import { createContext, useState } from 'react';
import { type ScriptType, DEFAULT_DATA_SCRIPT } from '~/state/script_font_data';

export const ScriptContext = createContext<{
  script: ScriptType;
  setScript: (script: ScriptType) => void;
}>({
  script: DEFAULT_DATA_SCRIPT,
  setScript: () => {}
});

export const ScriptProvider = ({
  children,
  initialScript
}: {
  children: React.ReactNode;
  initialScript: ScriptType;
}) => {
  const [script, setScript] = useState<ScriptType>(initialScript);

  return <ScriptContext.Provider value={{ script, setScript }}>{children}</ScriptContext.Provider>;
};
