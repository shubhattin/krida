import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ExternalLink, Book, Music } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/padajala/(public)/_public')({
  component: PublicLayout
});

function PublicLayout() {
  return (
    <>
      <Outlet />
      <footer
        className={cn(
          'pt-3 pb-6 sm:pt-4 sm:pb-6',
          'bg-linear-to-b from-slate-50 to-stone-50 dark:from-slate-900 dark:to-zinc-900'
        )}
      >
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-center gap-2">
              <ExternalLink className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Connect with us</span>
            </div>
            <div className="mb-6 flex justify-center gap-6">
              <a
                href="https://github.com/shubhattin/padavali/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-800/20 bg-gray-50 text-gray-800 transition-all duration-200 hover:border-gray-800/40 hover:bg-gray-100 hover:shadow-md dark:border-gray-300/20 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-gray-300/40 dark:hover:bg-gray-700/50"
                title="GitHub"
              >
                <SiGithub className="h-6 w-6" />
              </a>
              <a
                href="https://www.youtube.com/@TheSanskritChannel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-red-500/20 bg-red-50 text-red-600 transition-all duration-200 hover:border-red-500/40 hover:bg-red-100 hover:shadow-md dark:border-red-400/20 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-400/40 dark:hover:bg-red-900/40"
                title="YouTube"
              >
                <FaYoutube className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/thesanskritchannel/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-pink-500/20 bg-linear-to-br from-pink-50 to-purple-50 text-pink-600 transition-all duration-200 hover:border-pink-500/40 hover:from-pink-100 hover:to-purple-100 hover:shadow-md dark:border-pink-400/20 dark:from-pink-950/30 dark:to-purple-950/30 dark:text-pink-400 dark:hover:border-pink-400/40 dark:hover:from-pink-900/40 dark:hover:to-purple-900/40"
                title="Instagram"
              >
                <FaInstagram className="h-6 w-6" />
              </a>
            </div>
            <div className="mx-auto flex max-w-2xl flex-col justify-center gap-4 sm:flex-row">
              <a
                href="http://projects.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left text-sm font-medium transition-all duration-200 hover:border-primary/30 hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-green-500 to-emerald-600">
                  <Book className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Projects</div>
                  <div className="text-xs text-muted-foreground">Sanskrit Channel Projects</div>
                </div>
              </a>
              <a
                href="https://svara.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left text-sm font-medium transition-all duration-200 hover:border-primary/30 hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600">
                  <Music className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Svara Darshini</div>
                  <div className="text-xs text-muted-foreground">
                    Understand Principles of Music
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
