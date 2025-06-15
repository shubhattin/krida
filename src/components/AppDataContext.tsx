'use client';

import { createContext, useEffect, useState } from 'react';
import { authClient, useSession } from '~/lib/auth-client';
import { type ScriptType, DEFAULT_DATA_SCRIPT } from '~/state/script_font_data';

type SessionType = (typeof authClient.$Infer.Session)['user'] | null;
export const AppContext = createContext<{
  script: ScriptType;
  setScript: (script: ScriptType) => void;
  user_info: SessionType;
}>({
  script: DEFAULT_DATA_SCRIPT,
  setScript: () => {},
  user_info: null
});

export const AppContextProvider = ({
  children,
  initialScript,
  initialSession
}: {
  children: React.ReactNode;
  initialScript: ScriptType;
  initialSession: typeof authClient.$Infer.Session | null;
}) => {
  const [script, setScript] = useState<ScriptType>(initialScript);
  const session = useSession();

  const [userInfoFetched, setUserInfoFetched] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && !session.isPending && session.data) {
      setUserInfoFetched(true);
    }
  }, [session]);

  const user_info = (!userInfoFetched ? initialSession : session.data)?.user ?? null;

  return (
    <AppContext.Provider value={{ script, setScript, user_info }}>{children}</AppContext.Provider>
  );
};
