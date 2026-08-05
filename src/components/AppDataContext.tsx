'use client';

import { createContext, useState } from 'react';
import { type ScriptType, DEFAULT_DATA_SCRIPT } from '~/state/script_list';

export const AppContext = createContext<{
  script: ScriptType;
  setScript: (script: ScriptType) => void;
}>({
  script: DEFAULT_DATA_SCRIPT,
  setScript: () => {}
});

export const AppContextProvider = ({
  children,
  initialScript
}: {
  children: React.ReactNode;
  initialScript: ScriptType;
}) => {
  const [script, setScript] = useState<ScriptType>(initialScript);

  return <AppContext.Provider value={{ script, setScript }}>{children}</AppContext.Provider>;
};
