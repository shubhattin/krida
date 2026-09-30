import type { ReactNode } from 'react';
import { Book, Music } from 'lucide-react';
import { FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiGithub } from 'react-icons/si';
import { PWAInstallButton } from '~/components/PWA/PWAInit';
import { Separator } from '~/components/ui/separator';

export default function HubFooter({ showPwa = false }: { showPwa?: boolean }) {
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        {showPwa ? (
          <div className="flex flex-col items-center gap-3">
            <div className="onesignal-customlink-container" />
            <PWAInstallButton />
          </div>
        ) : null}

        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm">
            <p className="font-serif text-xl font-semibold tracking-tight">
              Sanskrit <span className="font-normal italic">Games</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A daily desk for Sanskrit word-search and crossword puzzles, from The Sanskrit
              Channel.
            </p>
          </div>
          <div className="flex gap-2">
            <FooterIcon href="https://github.com/shubhattin/padavali/" label="GitHub">
              <SiGithub className="size-4" />
            </FooterIcon>
            <FooterIcon href="https://www.youtube.com/@TheSanskritChannel" label="YouTube">
              <FaYoutube className="size-4" />
            </FooterIcon>
            <FooterIcon href="https://www.instagram.com/thesanskritchannel/" label="Instagram">
              <FaInstagram className="size-4" />
            </FooterIcon>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground">
            <a
              href="http://projects.thesanskritchannel.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 no-underline hover:text-foreground"
            >
              <Book className="size-3.5" />
              Projects
            </a>
            <a
              href="https://svara.thesanskritchannel.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 no-underline hover:text-foreground"
            >
              <Music className="size-3.5" />
              Svara Darshini
            </a>
            <a
              href="https://lipilekhika.in"
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline hover:text-foreground"
            >
              Lipi Lekhika
            </a>
          </div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Play · Learn · Grow
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterIcon({
  href,
  label,
  children
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      {children}
    </a>
  );
}
