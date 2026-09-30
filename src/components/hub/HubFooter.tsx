import type { ReactNode } from 'react';
import { Book, ExternalLink, Music } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaInstagram, FaYoutube } from 'react-icons/fa';
import { Link } from '@tanstack/react-router';
import { cn } from '~/lib/utils';
import { HUB_FULL_BLEED } from './hub_layout';
import { HUB_GAME_LIST } from './hub_games';

export function HubFooter({ extras }: { extras?: ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        HUB_FULL_BLEED,
        'mt-8 border-t border-border/50 bg-zinc-100/80 dark:bg-zinc-950'
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-8">
        {extras ? <div className="flex flex-col items-center gap-3">{extras}</div> : null}

        <div className="flex flex-col items-center gap-3 text-center">
          <Link to="/" className="font-serif text-xl font-bold tracking-tight no-underline">
            Sanskrit Games
          </Link>
          <p className="max-w-md text-sm text-muted-foreground">
            An open-source project from The Sanskrit Channel — word search, crossword, and more
            games for learning Sanskrit.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/" className="text-muted-foreground no-underline hover:text-foreground">
            Home
          </Link>
          <Link to="/explore" className="text-muted-foreground no-underline hover:text-foreground">
            Explore
          </Link>
          <Link
            to="/explore"
            search={{ view: 'collections' }}
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            Collections
          </Link>
          {HUB_GAME_LIST.map((game) => (
            <Link
              key={game.kind}
              to={game.href}
              className="text-muted-foreground no-underline hover:text-foreground"
            >
              {game.name}
            </Link>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <ExternalLink className="size-3.5" />
            Connect
          </div>
          <div className="flex justify-center gap-3">
            <a
              href="https://github.com/shubhattin/padavali/"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <SiGithub className="size-5" />
            </a>
            <a
              href="https://www.youtube.com/@TheSanskritChannel"
              target="_blank"
              rel="noopener noreferrer"
              title="YouTube"
              className="flex size-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400"
            >
              <FaYoutube className="size-5" />
            </a>
            <a
              href="https://www.instagram.com/thesanskritchannel/"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
              className="flex size-11 items-center justify-center rounded-xl border border-pink-200 bg-linear-to-br from-pink-50 to-purple-50 text-pink-600 transition-colors hover:border-pink-500 hover:bg-pink-500 hover:text-white dark:border-pink-900/60 dark:from-pink-950/40 dark:to-purple-950/40 dark:text-pink-400"
            >
              <FaInstagram className="size-5" />
            </a>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <a
            href="http://www.thesanskritchannel.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 p-3 no-underline transition-colors hover:border-primary/30 hover:bg-accent/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-green-500 to-emerald-600">
              <Book className="size-4 text-white" />
            </div>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">Main Site</span>
              <span className="text-xs text-muted-foreground">The Sanskrit Channel</span>
            </span>
          </a>
          <a
            href="https://svara.thesanskritchannel.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 p-3 no-underline transition-colors hover:border-primary/30 hover:bg-accent/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600">
              <Music className="size-4 text-white" />
            </div>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">Svara Darshini</span>
              <span className="text-xs text-muted-foreground">Principles of music</span>
            </span>
          </a>
        </div>

        <p className="text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          © {year} Sanskrit Games
        </p>
      </div>
    </footer>
  );
}
