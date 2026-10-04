import type { ReactNode } from 'react';
import { Book, BookOpen, ChevronRight, ExternalLink, Music } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import { PWAInstallButton } from '~/components/PWA/PWAInit';

export function HubFooter({
  showPwa = false,
  showOneSignal = false,
  children
}: {
  showPwa?: boolean;
  showOneSignal?: boolean;
  children?: ReactNode;
}) {
  return (
    <footer className="border-t border-border/70 bg-background px-4 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8">
        {showOneSignal ? <div className="onesignal-customlink-container" /> : null}
        {showPwa ? <PWAInstallButton /> : null}
        {children}

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/10">
              <BookOpen className="size-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight">Krida</span>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Sanskrit Games — an open-source interactive education project building modern tools for
            Sanskrit learning.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="size-4 text-slate-400" />
            <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
              Connect with us
            </span>
          </div>
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/shubhattin/padavali/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition-all duration-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
              title="GitHub"
            >
              <SiGithub className="size-6" />
            </a>
            <a
              href="https://www.youtube.com/@TheSanskritChannel"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-12 items-center justify-center rounded-xl border border-red-200 bg-red-50/50 text-red-600 shadow-xs transition-all duration-200 hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-950 dark:bg-red-950/20 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white"
              title="YouTube"
            >
              <FaYoutube className="size-6" />
            </a>
            <a
              href="https://www.instagram.com/thesanskritchannel/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-12 items-center justify-center rounded-xl border border-pink-200 bg-linear-to-br from-pink-50/40 to-purple-50/40 text-pink-600 shadow-xs transition-all duration-200 hover:border-pink-500 hover:bg-pink-500 hover:text-white dark:border-pink-950 dark:from-pink-950/20 dark:to-purple-950/20 dark:text-pink-400 dark:hover:border-pink-500 dark:hover:bg-pink-500 dark:hover:text-white"
              title="Instagram"
            >
              <FaInstagram className="size-6" />
            </a>
          </div>
        </div>

        <div className="flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <a
            href="http://projects.thesanskritchannel.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 text-left transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-blue-500/30 dark:hover:bg-blue-950/15"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-green-500 to-emerald-600 shadow-sm">
              <Book className="size-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                Projects
                <ChevronRight className="size-3" />
              </div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                Sanskrit Channel Projects
              </div>
            </div>
          </a>
          <a
            href="https://svara.thesanskritchannel.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/40 p-3 text-left transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-50/30 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-purple-500/30 dark:hover:bg-purple-950/15"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-sm">
              <Music className="size-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                Svara Darshini
                <ChevronRight className="size-3" />
              </div>
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                Understand Principles of Music
              </div>
            </div>
          </a>
        </div>

        <p className="text-center text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
          © {new Date().getFullYear()} Krida. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
