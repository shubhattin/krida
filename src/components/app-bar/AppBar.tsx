import { MenuButton } from '~/components/app-bar/AppBarMenu';
import { robotoSans } from '../fonts';
import SupportOptions from '~/components/app-bar/SupportOptions';

export default function AppBar({ title }: { title: string }) {
  return (
    <header className="w-full border-b border-slate-200/60 bg-gradient-to-r from-white via-slate-50 to-blue-50 shadow-lg backdrop-blur-sm dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 lg:px-6">
        {/* Logo/Title Section */}
        <div className="flex items-center space-x-3">
          <div
            className="flex h-12 w-12 items-center justify-center shadow-lg"
            style={{
              backgroundImage: "url('/img/icon_128_no_pad.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          ></div>
          <div>
            <h1
              className={`bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-2xl font-bold text-transparent dark:from-slate-100 dark:to-slate-300 ${robotoSans.className}`}
            >
              {title}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sanskrit Word Puzzle
            </p>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex items-center space-x-2">
          <SupportOptions />
          <MenuButton />
        </div>
      </div>
    </header>
  );
}
