import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

export const DEFAULT_THEME_STORAGE_KEY = 'vite-ui-theme';

const parseStoredTheme = (value: string | null, fallback: Theme): Theme => {
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  if (value === 'auto') return 'system';
  return fallback;
};

const applyThemeToRoot = (root: HTMLElement, resolved: 'light' | 'dark', mode: Theme) => {
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;

  if (mode === 'system') {
    root.removeAttribute('data-theme');
    return;
  }

  root.setAttribute('data-theme', mode);
};

export const createThemeInitScript = (
  storageKey: string = DEFAULT_THEME_STORAGE_KEY,
  defaultTheme: Theme = 'system'
) =>
  `(function(){try{var stored=window.localStorage.getItem(${JSON.stringify(storageKey)});var mode=(stored==='light'||stored==='dark'||stored==='system')?stored:(stored==='auto'?'system':${JSON.stringify(defaultTheme)});var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='system'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);root.style.colorScheme=resolved;if(mode==='system'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}}catch(e){}})();`;

export const THEME_INIT_SCRIPT = createThemeInitScript();

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = DEFAULT_THEME_STORAGE_KEY,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window !== 'undefined'
      ? parseStoredTheme(localStorage.getItem(storageKey), defaultTheme)
      : defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    const applyResolved = (resolved: 'light' | 'dark', mode: Theme) => {
      applyThemeToRoot(root, resolved, mode);
    };

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const sync = () => applyResolved(mq.matches ? 'dark' : 'light', 'system');
      sync();
      mq.addEventListener('change', sync);
      return () => mq.removeEventListener('change', sync);
    }

    applyResolved(theme, theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (nextTheme: Theme) => {
      setThemeState(nextTheme);
      try {
        localStorage.setItem(storageKey, nextTheme);
      } catch (error) {
        console.warn('Failed to persist theme preference.', error);
      }
    }
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
