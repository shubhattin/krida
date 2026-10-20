import { ArrowUpRight } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaInstagram, FaYoutube } from 'react-icons/fa';

const SOCIAL_LINKS = [
  { href: 'https://github.com/shubhattin/padavali/', label: 'GitHub', icon: SiGithub },
  { href: 'https://www.youtube.com/@TheSanskritChannel', label: 'YouTube', icon: FaYoutube },
  { href: 'https://www.instagram.com/thesanskritchannel/', label: 'Instagram', icon: FaInstagram }
];

const PROJECT_LINKS = [
  { href: 'https://projects.thesanskritchannel.org/', label: 'Projects' },
  { href: 'https://svara.thesanskritchannel.org/', label: 'Svara Darshini' }
];

export function HubFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          <span className="font-bold text-foreground">Krida</span>
          <span className="mx-2 text-border">/</span>
          Open-source Sanskrit games by The Sanskrit Channel
        </p>
        <nav aria-label="Elsewhere" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {PROJECT_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-muted-foreground no-underline transition-colors hover:text-foreground"
            >
              {link.label}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          ))}
          <span className="h-4 w-px bg-border" aria-hidden />
          <div className="flex items-center gap-1">
            {SOCIAL_LINKS.map(({ href, label, icon: SocialIcon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <SocialIcon className="size-4" />
              </a>
            ))}
          </div>
        </nav>
      </div>
    </footer>
  );
}
