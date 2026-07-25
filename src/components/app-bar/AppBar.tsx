import Link from 'next/link';
import type { ReactNode } from 'react';
import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { robotoSans } from '../fonts';
import SupportOptions from '~/components/app-bar/SupportOptions';
import { GameAppIcon } from '~/components/GameAppIcon';

export type AppGame = 'padavali' | 'crossword';

const GAME_DEFAULTS: Record<
  AppGame,
  {
    title: string;
    description: string;
    href: string;
    showPwaControls: boolean;
  }
> = {
  padavali: {
    title: 'Padāvalī',
    description: 'Sanskrit Word Puzzle',
    href: '/padavali',
    showPwaControls: true
  },
  crossword: {
    title: 'Padajāla',
    description: 'Crossword Puzzles',
    href: '/padajala',
    showPwaControls: false
  }
};

export type AppBarProps = {
  game: AppGame;
  title?: string;
  description?: string;
  /** @deprecated Ignored — brand mark uses the shared GameAppIcon. */
  imageUrl?: string;
  gameMenuItems?: ReactNode;
};

export default function AppBar({ game, title, description, gameMenuItems }: AppBarProps) {
  const defaults = GAME_DEFAULTS[game];
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;

  return (
    <header className="w-full border-b border-slate-200/60 bg-linear-to-r from-white via-slate-50 to-blue-50 shadow-lg backdrop-blur-sm dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 lg:px-6">
        {/* Logo/Title Section */}
        <Link href={defaults.href} className="group flex items-center space-x-3 no-underline">
          <GameAppIcon
            name={resolvedTitle}
            size="md"
            className="transition-transform duration-200 group-hover:scale-105"
          />
          <div>
            <h1
              className={`bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-2xl font-bold text-transparent transition-all duration-200 group-hover:from-blue-600 group-hover:to-indigo-500 dark:from-slate-100 dark:to-slate-300 dark:group-hover:from-blue-400 dark:group-hover:to-indigo-300 ${robotoSans.className}`}
            >
              {resolvedTitle}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {resolvedDescription}
            </p>
          </div>
        </Link>

        {/* Actions Section */}
        <div className="flex shrink-0 items-center space-x-2">
          <SupportOptions />
          <div className="size-8 shrink-0">
            <MenuButton showPwaControls={defaults.showPwaControls} gameMenuItems={gameMenuItems} />
          </div>
        </div>
      </div>
    </header>
  );
}
