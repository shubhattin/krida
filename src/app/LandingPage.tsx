import { Button } from '@/components/ui/button';
import { Sparkles, BookOpen, Play, ArrowRight, ExternalLink, Book, Music } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { FaYoutube, FaInstagram } from 'react-icons/fa';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20">
        <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="mb-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Sanskrit Learning
            </div>
            <h1 className="mb-6 bg-linear-to-r from-foreground via-primary to-accent-foreground bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
              Learn Sanskrit
              <br />
              Through Games
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground md:text-2xl">
              Discover the beauty of Sanskrit through interactive games that make learning ancient
              wisdom fun, engaging, and accessible across multiple Indian scripts.
            </p>
          </div>

          <div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              render={<Link href="/padavali" className="flex items-center gap-2" />}
              nativeButton={false}
              size="lg"
              className="h-auto px-8 py-6 text-lg"
            >
              <Play className="h-5 w-5" />
              Play Padavali Now
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { number: '8+', label: 'Indian Scripts' },
              { number: '100+', label: 'Sanskrit Words' },
              { number: '∞', label: 'Learning Fun' },
              { number: '100%', label: 'Free & Open' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-primary md:text-3xl">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Main Footer Content */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Sanskrit Games</span>
            </div>
            <p className="mb-4 text-muted-foreground">
              Making Sanskrit accessible through interactive learning experiences.
            </p>
          </div>

          {/* Social Media Links */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
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
                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-pink-500/20 bg-gradient-to-br from-pink-50 to-purple-50 text-pink-600 transition-all duration-200 hover:border-pink-500/40 hover:from-pink-100 hover:to-purple-100 hover:shadow-md dark:border-pink-400/20 dark:from-pink-950/30 dark:to-purple-950/30 dark:text-pink-400 dark:hover:border-pink-400/40 dark:hover:from-pink-900/40 dark:hover:to-purple-900/40"
                title="Instagram"
              >
                <FaInstagram className="h-6 w-6" />
              </a>
            </div>

            {/* Project Links */}
            <div className="mx-auto flex max-w-2xl flex-col justify-center gap-4 sm:flex-row">
              <a
                href="http://www.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left text-sm font-medium transition-all duration-200 hover:border-primary/30 hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                  <Book className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">Main Site</div>
                  <div className="text-xs text-muted-foreground">The Sanskrit Channel Website</div>
                </div>
              </a>

              <a
                href="https://svara.thesanskritchannel.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left text-sm font-medium transition-all duration-200 hover:border-primary/30 hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
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
    </div>
  );
}
